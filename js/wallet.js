// Load wallet data
async function loadWalletData() {
    showLoading(true)
    
    try {
        // Get user profile with balance
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            window.location.href = 'login.html'
            return
        }
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('wallet_balance, locked_balance')
            .eq('id', user.id)
            .single()
        
        if (error) throw error
        
        // Update UI
        document.getElementById('wallet-balance').textContent = 
            `$${profile.wallet_balance.toFixed(2)}`
        document.getElementById('locked-balance').textContent = 
            `$${profile.locked_balance.toFixed(2)}`
        document.getElementById('total-balance').textContent = 
            `$${(profile.wallet_balance + profile.locked_balance).toFixed(2)}`
        document.getElementById('available-balance').textContent = 
            profile.wallet_balance.toFixed(2)
        
    } catch (error) {
        console.error('Error loading wallet:', error)
        alert('Error loading wallet data')
    } finally {
        showLoading(false)
    }
}

// Load transactions
async function loadTransactions() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
    
    if (error) {
        console.error('Error loading transactions:', error)
        return
    }
    
    const tbody = document.getElementById('transactions-list')
    tbody.innerHTML = ''
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty">No transactions yet</td></tr>'
        return
    }
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr')
        const date = new Date(transaction.created_at).toLocaleDateString()
        const amountClass = transaction.type.includes('deposit') || 
                           transaction.type.includes('won') ? 'positive' : 'negative'
        
        row.innerHTML = `
            <td>${date}</td>
            <td><span class="badge badge-${transaction.type}">${transaction.type.replace('_', ' ')}</span></td>
            <td class="${amountClass}">${transaction.type.includes('lost') ? '-' : ''}$${transaction.amount.toFixed(2)}</td>
            <td><span class="status status-${transaction.status}">${transaction.status}</span></td>
            <td>${transaction.description || '-'}</td>
        `
        tbody.appendChild(row)
    })
}

// Show deposit modal
function showDepositModal() {
    document.getElementById('deposit-modal').style.display = 'block'
}

// Show withdraw modal
function showWithdrawModal() {
    const available = parseFloat(document.getElementById('available-balance').textContent)
    if (available < 20) {
        alert('Minimum withdrawal amount is $20. You need at least $20 available balance.')
        return
    }
    document.getElementById('withdraw-modal').style.display = 'block'
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none'
}

// Process deposit
async function processDeposit() {
    const amountInput = document.getElementById('deposit-amount')
    const amount = parseFloat(amountInput.value)
    
    if (!amount || amount < 10 || amount > 10000) {
        alert('Please enter a valid amount between $10 and $10,000')
        return
    }
    
    const method = document.querySelector('.payment-method.active').dataset.method
    const { data: { user } } = await supabase.auth.getUser()
    
    showLoading(true)
    
    try {
        // Create transaction record
        const { data: transaction, error } = await supabase
            .from('transactions')
            .insert([{
                user_id: user.id,
                type: 'deposit',
                amount: amount,
                balance_before: 0,
                balance_after: amount,
                description: `Deposit via ${method}`,
                status: 'pending'
            }])
            .select()
            .single()
        
        if (error) throw error
        
        // Send notification to admin (in real system)
        console.log('Deposit requested:', transaction.id)
        
        alert('Deposit request submitted! Please wait for admin approval.')
        closeModal('deposit-modal')
        amountInput.value = ''
        await loadWalletData()
        await loadTransactions()
        
    } catch (error) {
        console.error('Error processing deposit:', error)
        alert('Error processing deposit request')
    } finally {
        showLoading(false)
    }
}

// Process withdrawal
async function processWithdrawal() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value)
    const method = document.getElementById('withdraw-method').value
    const accountInfo = document.getElementById('account-info').value
    
    if (!amount || amount < 20) {
        alert('Minimum withdrawal amount is $20')
        return
    }
    
    const available = parseFloat(document.getElementById('available-balance').textContent)
    if (amount > available) {
        alert('Insufficient available balance')
        return
    }
    
    if (method !== 'bank' && method !== 'crypto' && method !== 'paypal') {
        alert('Please select a valid withdrawal method')
        return
    }
    
    if (!accountInfo) {
        alert('Please enter your account details')
        return
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    
    showLoading(true)
    
    try {
        // Create withdrawal request
        const { data: withdrawal, error } = await supabase
            .from('withdrawal_requests')
            .insert([{
                user_id: user.id,
                amount: amount,
                method: method,
                account_details: { details: accountInfo },
                status: 'pending'
            }])
            .select()
            .single()
        
        if (error) throw error
        
        // Create transaction record
        await supabase
            .from('transactions')
            .insert([{
                user_id: user.id,
                type: 'withdrawal',
                amount: amount,
                balance_before: available,
                balance_after: available - amount,
                description: `Withdrawal to ${method}`,
                status: 'pending',
                reference_id: withdrawal.id.toString()
            }])
        
        // Update user wallet (lock the amount)
        const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', user.id)
            .single()
        
        await supabase
            .from('profiles')
            .update({
                wallet_balance: profile.wallet_balance - amount,
                locked_balance: profile.locked_balance + amount
            })
            .eq('id', user.id)
        
        alert('Withdrawal request submitted! Admin will process within 24 hours.')
        closeModal('withdraw-modal')
        document.getElementById('withdraw-amount').value = ''
        document.getElementById('account-info').value = ''
        
        await loadWalletData()
        await loadTransactions()
        
    } catch (error) {
        console.error('Error processing withdrawal:', error)
        alert('Error processing withdrawal request')
    } finally {
        showLoading(false)
    }
}

// Show transactions
function showTransactions() {
    document.querySelector('.transactions-section').scrollIntoView({ behavior: 'smooth' })
}

// Show/hide loading
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none'
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none'
    }
}

// Export functions
window.showDepositModal = showDepositModal
window.showWithdrawModal = showWithdrawModal
window.closeModal = closeModal
window.processDeposit = processDeposit
window.processWithdrawal = processWithdrawal
window.showTransactions = showTransactions
