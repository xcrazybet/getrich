// Check if user is logged in
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session && !window.location.href.includes('login.html') && 
        !window.location.href.includes('register.html') && 
        !window.location.href.includes('index.html')) {
        window.location.href = 'login.html'
        return null
    }
    
    return session
}

// Login function
async function login() {
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const messageEl = document.getElementById('auth-message')
    
    messageEl.textContent = ''
    messageEl.className = 'message'
    
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error')
        return
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })
    
    if (error) {
        showMessage(error.message, 'error')
    } else {
        showMessage('Login successful! Redirecting...', 'success')
        
        // Check if profile exists, create if not
        await createUserProfile(data.user)
        
        setTimeout(() => {
            window.location.href = 'index.html'
        }, 1000)
    }
}

// Register function
async function register() {
    const full_name = document.getElementById('full_name').value
    const email = document.getElementById('email').value
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value
    const confirm_password = document.getElementById('confirm_password').value
    const terms = document.getElementById('terms').checked
    
    if (!full_name || !email || !username || !password || !confirm_password) {
        showMessage('Please fill in all fields', 'error')
        return
    }
    
    if (password !== confirm_password) {
        showMessage('Passwords do not match', 'error')
        return
    }
    
    if (password.length < 8) {
        showMessage('Password must be at least 8 characters', 'error')
        return
    }
    
    if (!terms) {
        showMessage('You must accept the terms and conditions', 'error')
        return
    }
    
    // Check if username exists
    const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single()
    
    if (existingUser) {
        showMessage('Username already taken', 'error')
        return
    }
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name,
                username
            }
        }
    })
    
    if (authError) {
        showMessage(authError.message, 'error')
    } else {
        showMessage('Account created! Please check your email for verification.', 'success')
        
        // Create profile
        await createUserProfile(authData.user, full_name, username)
        
        setTimeout(() => {
            window.location.href = 'login.html'
        }, 3000)
    }
}

// Create user profile
async function createUserProfile(user, full_name = null, username = null) {
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
    
    if (!existingProfile) {
        const { error } = await supabase
            .from('profiles')
            .insert([{
                id: user.id,
                email: user.email,
                full_name: full_name || user.user_metadata?.full_name,
                username: username || user.user_metadata?.username,
                user_type: 'regular',
                wallet_balance: 0.00,
                locked_balance: 0.00
            }])
        
        if (error && !error.message.includes('duplicate key')) {
            console.error('Error creating profile:', error)
        }
    }
}

// Logout function
async function logout() {
    await supabase.auth.signOut()
    window.location.href = 'index.html'
}

// Show message
function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('auth-message') || createMessageElement()
    messageEl.textContent = text
    messageEl.className = `message ${type}`
    
    if (type === 'success') {
        setTimeout(() => {
            messageEl.textContent = ''
            messageEl.className = 'message'
        }, 5000)
    }
}

function createMessageElement() {
    const el = document.createElement('div')
    el.id = 'auth-message'
    el.className = 'message'
    document.getElementById('auth-form').appendChild(el)
    return el
}

// Export functions
window.login = login
window.register = register
window.logout = logout
window.checkAuth = checkAuth
