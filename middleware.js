import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
export async function middleware(request) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) => 
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    //Refresh session
    const { data: { user } } = await supabase.auth.getUser()

    //if user is not logged in and trying to access protected routes, redirect to login
    if (!user && !request.nextUrl.pathname.startsWith('/login')) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: ['/dashboard/:path*', '/api/:path*'],
}