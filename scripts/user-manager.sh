#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="/var/log/user-manager.log"
MIN_UID=1000

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root (sudo)."
  exit 1
fi

touch "${LOG_FILE}"
chmod 600 "${LOG_FILE}"

log() {
  echo "[$(date '+%F %T')] $*" | tee -a "${LOG_FILE}" >/dev/null
}

pause() {
  read -r -p "Press Enter to continue..."
}

user_exists() {
  local username="$1"
  id "${username}" >/dev/null 2>&1
}

is_protected_user() {
  local username="$1"
  case "${username}" in
    root|ubuntu|admin) return 0 ;;
    *) return 1 ;;
  esac
}

read_username() {
  local prompt="$1"
  local username
  read -r -p "${prompt}" username
  username="$(echo "${username}" | tr -d '[:space:]')"
  if [[ -z "${username}" ]]; then
    echo "Username cannot be empty."
    return 1
  fi
  if [[ ! "${username}" =~ ^[a-z_][a-z0-9_-]*[$]?$ ]]; then
    echo "Invalid username format."
    return 1
  fi
  printf "%s" "${username}"
}

create_user() {
  local username
  username="$(read_username "Enter new username: ")" || return

  if user_exists "${username}"; then
    echo "User '${username}' already exists."
    return
  fi

  local shell="/bin/bash"
  read -r -p "Shell [${shell}]: " input_shell
  if [[ -n "${input_shell:-}" ]]; then
    shell="${input_shell}"
  fi

  useradd -m -s "${shell}" "${username}"
  echo "Set password for '${username}':"
  passwd "${username}"

  read -r -p "Add '${username}' to sudo group? (y/N): " make_sudo
  if [[ "${make_sudo,,}" == "y" ]]; then
    usermod -aG sudo "${username}"
    log "Created user '${username}' with sudo access."
    echo "User '${username}' created and added to sudo."
  else
    log "Created user '${username}'."
    echo "User '${username}' created."
  fi
}

delete_user() {
  local username
  username="$(read_username "Enter username to delete: ")" || return

  if ! user_exists "${username}"; then
    echo "User '${username}' does not exist."
    return
  fi

  if is_protected_user "${username}"; then
    echo "Refusing to delete protected user '${username}'."
    return
  fi

  read -r -p "Delete home directory for '${username}' too? (y/N): " remove_home
  local del_flag=""
  if [[ "${remove_home,,}" == "y" ]]; then
    del_flag="-r"
  fi

  read -r -p "Type YES to confirm deletion of '${username}': " confirm
  if [[ "${confirm}" != "YES" ]]; then
    echo "Deletion cancelled."
    return
  fi

  userdel ${del_flag} "${username}"
  log "Deleted user '${username}' (remove_home=${remove_home:-N})."
  echo "User '${username}' deleted."
}

reset_password() {
  local username
  username="$(read_username "Enter username to reset password: ")" || return

  if ! user_exists "${username}"; then
    echo "User '${username}' does not exist."
    return
  fi

  passwd "${username}"
  log "Password reset for '${username}'."
  echo "Password reset complete."
}

add_to_sudo() {
  local username
  username="$(read_username "Enter username to add to sudo group: ")" || return

  if ! user_exists "${username}"; then
    echo "User '${username}' does not exist."
    return
  fi

  usermod -aG sudo "${username}"
  log "Added '${username}' to sudo group."
  echo "User '${username}' added to sudo group."
}

remove_from_sudo() {
  local username
  username="$(read_username "Enter username to remove from sudo group: ")" || return

  if ! user_exists "${username}"; then
    echo "User '${username}' does not exist."
    return
  fi

  if is_protected_user "${username}"; then
    echo "Refusing to remove protected user '${username}' from sudo."
    return
  fi

  gpasswd -d "${username}" sudo >/dev/null
  log "Removed '${username}' from sudo group."
  echo "User '${username}' removed from sudo group."
}

lock_user() {
  local username
  username="$(read_username "Enter username to lock: ")" || return

  if ! user_exists "${username}"; then
    echo "User '${username}' does not exist."
    return
  fi

  usermod -L "${username}"
  log "Locked user '${username}'."
  echo "User '${username}' locked."
}

unlock_user() {
  local username
  username="$(read_username "Enter username to unlock: ")" || return

  if ! user_exists "${username}"; then
    echo "User '${username}' does not exist."
    return
  fi

  usermod -U "${username}"
  log "Unlocked user '${username}'."
  echo "User '${username}' unlocked."
}

list_human_users() {
  echo "Human users (UID >= ${MIN_UID}):"
  awk -F: -v min_uid="${MIN_UID}" '$3 >= min_uid && $1 != "nobody" {printf " - %s (uid=%s, shell=%s)\n", $1, $3, $7}' /etc/passwd
}

show_menu() {
  clear
  cat <<'EOF'
=========================================
         User Management Utility
=========================================
1) Create user
2) Delete user
3) Reset password
4) Add user to sudo
5) Remove user from sudo
6) Lock user
7) Unlock user
8) List users
9) Show recent log entries
0) Exit
EOF
}

show_logs() {
  if [[ -s "${LOG_FILE}" ]]; then
    tail -n 30 "${LOG_FILE}"
  else
    echo "No logs yet."
  fi
}

while true; do
  show_menu
  read -r -p "Select option: " choice

  case "${choice}" in
    1) create_user; pause ;;
    2) delete_user; pause ;;
    3) reset_password; pause ;;
    4) add_to_sudo; pause ;;
    5) remove_from_sudo; pause ;;
    6) lock_user; pause ;;
    7) unlock_user; pause ;;
    8) list_human_users; pause ;;
    9) show_logs; pause ;;
    0) echo "Goodbye."; exit 0 ;;
    *) echo "Invalid option."; pause ;;
  esac
done
