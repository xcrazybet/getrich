import { supabase } from './supabase.js'

// Check authentication
async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
        console.error('Auth error:', error)
        return null
    }
    return session
}

// Login function
async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        
        if (error) throw error
        return data
    } catch (error) {
        console.error('Login error:', error)
        throw error
    }
}

// Register function
async function register(email, password, userData) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: userData
            }
        })
        
        if (error) throw error
        
        // Create profile if needed
        if (data.user) {
            await createUserProfile(data.user, userData)
        }
        
        return data
    } catch (error) {
        console.error('Register error:', error)
        throw error
    }
}

// Create user profile
async function createUserProfile(user, userData) {
    try {
        // Check if profile exists
        const { data: existingProfile, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single()
        
        // If profile doesn't exist, create it
        if (!existingProfile || checkError?.code === 'PGRST116') {
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([{
                    id: user.id,
                    email: user.email,
                    full_name: userData?.full_name || '',
                    username: userData?.username || '',
                    user_type: 'regular',
                    wallet_balance: 0.00,
                    locked_balance: 0.00
                }])
            
            if (insertError && !insertError.message.includes('duplicate key')) {
                console.error('Error creating profile:', insertError)
            }
        }
    } catch (error) {
        console.error('Profile creation error:', error)
    }
}

// Logout function
async function logout() {
    try {
        await supabase.auth.signOut()
        window.location.href = 'index.html'
    } catch (error) {
        console.error('Logout error:', error)
    }
}

// Get current user
async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
        console.error('Get user error:', error)
        return null
    }
    return user
}

// Get user profile
async function getUserProfile() {
    const user = await getCurrentUser()
    if (!user) return null
    
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        
        if (error) {
            console.error('Get profile error:', error)
            return null
        }
        
        return profile
    } catch (error) {
        console.error('Profile fetch error:', error)
        return null
    }
}

// Update profile
async function updateProfile(updates) {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')
    
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
    
    if (error) throw error
    return data
}

// Check auth status on page load
async function checkAuthStatus() {
    const session = await checkAuth()
    
    // Update UI elements
    const loginBtn = document.getElementById('login-btn')
    const logoutBtn = document.getElementById('logout-btn')
    const registerBtn = document.getElementById('register-btn')
    
    if (loginBtn && logoutBtn) {
        if (session) {
            // User is logged in
            loginBtn.style.display = 'none'
            if (registerBtn) registerBtn.style.display = 'none'
            logoutBtn.style.display = 'inline-flex'
            logoutBtn.onclick = logout
            
            // Load user profile for wallet display
            const profile = await getUserProfile()
            if (profile) {
                const walletElement = document.getElementById('wallet-balance-nav')
                if (walletElement) {
                    walletElement.textContent = `$${profile.wallet_balance.toFixed(2)}`
                }
            }
        } else {
            // User is logged out
            loginBtn.style.display = 'inline-flex'
            if (registerBtn) registerBtn.style.display = 'inline-flex'
            logoutBtn.style.display = 'none'
        }
    }
    
    return session
}

// Export functions
window.login = login
window.register = register
window.logout = logout
window.checkAuth = checkAuth
window.getCurrentUser = getCurrentUser
window.getUserProfile = getUserProfile
window.updateProfile = updateProfile
window.checkAuthStatus = checkAuthStatus

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event)
    checkAuthStatus()
})
