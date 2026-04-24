module.exports = {
    apps: [
      {
        name: "jobbot-web",
        script: "node_modules/.bin/next",
        args: "start",
        cwd: "/root/jobs", 
        env: {
          NODE_ENV: "production",
          PORT: 3000,
        },
      },
      {
        name: "jobbot-bot",
        script: "bot/index.js",
        cwd: "/root/jobs",
        interpreter: "node",
        env: {
          NODE_ENV: "production",
          PORT: 3001,
        },
      },
    ],
  };