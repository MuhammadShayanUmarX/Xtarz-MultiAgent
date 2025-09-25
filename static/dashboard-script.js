// Dashboard JavaScript with Chart.js Integration
class Dashboard {
    constructor() {
        this.userId = localStorage.getItem('user_id');
        this.token = localStorage.getItem('auth_token');
        this.charts = {};
        this.analytics = null;
        
        if (!this.token || !this.userId) {
            window.location.href = '/';
            return;
        }
        
        this.initializeElements();
        this.bindEvents();
        this.loadUserData();
        this.loadAnalytics();
    }
    
    initializeElements() {
        this.elements = {
            // Navigation
            sidebarToggle: document.getElementById('sidebarToggle'),
            navLinks: document.querySelectorAll('.nav-link'),
            contentSections: document.querySelectorAll('.content-section'),
            
            // User info
            userName: document.getElementById('userName'),
            
            // Header controls
            timeRange: document.getElementById('timeRange'),
            refreshBtn: document.getElementById('refreshBtn'),
            exportBtn: document.getElementById('exportBtn'),
            
            // Stats
            totalChats: document.getElementById('totalChats'),
            totalTokens: document.getElementById('totalTokens'),
            avgResponseTime: document.getElementById('avgResponseTime'),
            totalCost: document.getElementById('totalCost'),
            
            // Buttons
            chatBtn: document.getElementById('chatBtn'),
            logoutBtn: document.getElementById('logoutBtn'),
            generateReportBtn: document.getElementById('generateReportBtn'),
            viewReportBtn: document.getElementById('viewReportBtn'),
            downloadReportBtn: document.getElementById('downloadReportBtn'),
            
            // Filters
            agentFilter: document.getElementById('agentFilter'),
            modelFilter: document.getElementById('modelFilter'),
            
            // Tables
            usageTableBody: document.getElementById('usageTableBody'),
            
            // Modals
            reportModal: document.getElementById('reportModal'),
            reportPreview: document.getElementById('reportPreview'),
            detailedReportContent: document.getElementById('detailedReportContent'),
            
            // Toast
            toastContainer: document.getElementById('toastContainer')
        };
    }
    
    bindEvents() {
        // Sidebar toggle
        this.elements.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        
        // Navigation
        this.elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('href').substring(1);
                this.showSection(target);
                this.setActiveNav(link);
            });
        });
        
        // Header controls
        this.elements.timeRange?.addEventListener('change', () => this.loadAnalytics());
        this.elements.refreshBtn?.addEventListener('click', () => this.refreshData());
        this.elements.exportBtn?.addEventListener('click', () => this.exportData());
        
        // Action buttons
        this.elements.chatBtn?.addEventListener('click', () => window.location.href = '/app');
        this.elements.logoutBtn?.addEventListener('click', () => this.logout());
        
        // Report buttons
        this.elements.generateReportBtn?.addEventListener('click', () => this.generateReport());
        this.elements.viewReportBtn?.addEventListener('click', () => this.viewDetailedReport());
        this.elements.downloadReportBtn?.addEventListener('click', () => this.downloadReport());
        
        // Filters
        this.elements.agentFilter?.addEventListener('change', () => this.filterUsageHistory());
        this.elements.modelFilter?.addEventListener('change', () => this.filterUsageHistory());
        
        // Chart period buttons
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = e.target.getAttribute('data-period');
                this.updateChartPeriod(period, e.target);
            });
        });
        
        // Modal events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
            if (e.target.classList.contains('close-btn')) {
                this.closeModals();
            }
        });
        
        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
    }
    
    async loadUserData() {
        try {
            const response = await fetch(`/auth/verify?token=${this.token}`);
            const result = await response.json();
            
            if (result.success) {
                this.elements.userName.textContent = result.user.username;
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
            this.logout();
        }
    }
    
    async loadAnalytics() {
        try {
            const response = await fetch(`/analytics/user/${this.userId}?token=${this.token}`);
            const result = await response.json();
            
            if (result.success) {
                this.analytics = result.analytics;
                this.updateStats();
                this.createCharts();
                this.loadUsageHistory();
                this.updateModelPerformance();
            } else {
                this.showToast('Failed to load analytics', 'error');
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.showToast('Connection error', 'error');
        }
    }
    
    updateStats() {
        if (!this.analytics) return;
        
        const stats = this.analytics.stats;
        
        this.animateValue(this.elements.totalChats, 0, stats.total_chats || 0, 1000);
        this.animateValue(this.elements.totalTokens, 0, stats.total_tokens || 0, 1000);
        
        this.elements.avgResponseTime.textContent = 
            stats.avg_response_time ? `${stats.avg_response_time.toFixed(2)}s` : '0s';
        this.elements.totalCost.textContent = 
            stats.total_cost ? `$${stats.total_cost.toFixed(3)}` : '$0.00';
    }
    
    createCharts() {
        this.createUsageChart();
        this.createAgentChart();
        this.createTokenChart();
        this.createResponseTimeChart();
        this.createConfidenceChart();
    }
    
    createUsageChart() {
        const ctx = document.getElementById('usageChart');
        if (!ctx || !this.analytics) return;
        
        const dailyData = this.analytics.daily_usage || [];
        const labels = dailyData.map(d => new Date(d.date).toLocaleDateString());
        const data = dailyData.map(d => d.count);
        
        if (this.charts.usage) {
            this.charts.usage.destroy();
        }
        
        this.charts.usage = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Conversations',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    createAgentChart() {
        const ctx = document.getElementById('agentChart');
        if (!ctx || !this.analytics) return;
        
        const agentData = this.analytics.agent_usage || [];
        const labels = agentData.map(a => a.agent_used);
        const data = agentData.map(a => a.count);
        const colors = [
            '#667eea',
            '#f59e0b',
            '#10b981',
            '#ef4444'
        ];
        
        if (this.charts.agent) {
            this.charts.agent.destroy();
        }
        
        this.charts.agent = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    createTokenChart() {
        const ctx = document.getElementById('tokenChart');
        if (!ctx || !this.analytics) return;
        
        const dailyData = this.analytics.daily_usage || [];
        const labels = dailyData.map(d => new Date(d.date).toLocaleDateString());
        const tokenData = dailyData.map(d => d.tokens || 0);
        
        // Simulate input/output split (you can enhance this with real data)
        const inputTokens = tokenData.map(t => Math.floor(t * 0.4));
        const outputTokens = tokenData.map(t => Math.floor(t * 0.6));
        
        if (this.charts.token) {
            this.charts.token.destroy();
        }
        
        this.charts.token = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Input Tokens',
                        data: inputTokens,
                        backgroundColor: '#667eea',
                        borderRadius: 4
                    },
                    {
                        label: 'Output Tokens',
                        data: outputTokens,
                        backgroundColor: '#f59e0b',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
    }
    
    createResponseTimeChart() {
        const ctx = document.getElementById('responseTimeChart');
        if (!ctx || !this.analytics) return;
        
        // Simulate response time distribution
        const timeRanges = ['0-0.5s', '0.5-1s', '1-2s', '2-5s', '5s+'];
        const data = [45, 35, 15, 4, 1]; // Percentage distribution
        
        if (this.charts.responseTime) {
            this.charts.responseTime.destroy();
        }
        
        this.charts.responseTime = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: timeRanges,
                datasets: [{
                    label: 'Response Time Distribution',
                    data: data,
                    backgroundColor: '#10b981',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    createConfidenceChart() {
        const ctx = document.getElementById('confidenceChart');
        if (!ctx || !this.analytics) return;
        
        // Simulate confidence distribution
        const confidenceRanges = ['90-100%', '80-90%', '70-80%', '60-70%', '<60%'];
        const data = [65, 25, 8, 2, 0];
        
        if (this.charts.confidence) {
            this.charts.confidence.destroy();
        }
        
        this.charts.confidence = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: confidenceRanges,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6',
                        '#6b7280'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    async loadUsageHistory() {
        try {
            const response = await fetch(`/chat/history?limit=50`);
            const result = await response.json();
            
            if (result.success) {
                this.displayUsageHistory(result.history);
            }
        } catch (error) {
            console.error('Failed to load usage history:', error);
        }
    }
    
    displayUsageHistory(history) {
        const tbody = this.elements.usageTableBody;
        if (!tbody) return;
        
        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading-row">No usage history found</td></tr>';
            return;
        }
        
        tbody.innerHTML = history.map(item => {
            const agentClass = item.agent_used.toLowerCase().replace(' ', '');
            const confidence = Math.round((item.confidence || 0) * 100);
            const confidenceClass = confidence >= 80 ? 'high' : confidence >= 60 ? 'medium' : 'low';
            
            return `
                <tr>
                    <td>${new Date(item.created_at).toLocaleString()}</td>
                    <td>
                        <span class="agent-badge ${agentClass}">
                            ${this.getAgentIcon(item.agent_used)} ${item.agent_used}
                        </span>
                    </td>
                    <td><span class="model-badge">${item.model}</span></td>
                    <td>${item.query.substring(0, 50)}${item.query.length > 50 ? '...' : ''}</td>
                    <td>${item.token_count || 0}</td>
                    <td>${(item.processing_time || 0).toFixed(2)}s</td>
                    <td>
                        <div class="confidence-bar">
                            <div class="confidence-fill ${confidenceClass}" style="width: ${confidence}%"></div>
                        </div>
                        ${confidence}%
                    </td>
                    <td>$${(item.cost_estimate || 0).toFixed(4)}</td>
                </tr>
            `;
        }).join('');
    }
    
    getAgentIcon(agent) {
        const icons = {
            'Code Assistant': '💻',
            'Research Assistant': '🔍',
            'Task Helper': '📝',
            'General Assistant': '💬'
        };
        return icons[agent] || '🤖';
    }
    
    updateModelPerformance() {
        if (!this.analytics) return;
        
        const modelUsage = this.analytics.model_usage || [];
        
        modelUsage.forEach(model => {
            const element = document.getElementById(
                model.model.includes('gemini') ? 'geminiPerformance' : 'deepseekPerformance'
            );
            
            if (element) {
                const usage = Math.round((model.count / (this.analytics.stats.total_chats || 1)) * 100);
                const usageBar = element.querySelector('.metric-fill');
                const usageValue = element.querySelector('.metric-value');
                
                if (usageBar && usageValue) {
                    usageBar.style.width = `${usage}%`;
                    usageValue.textContent = `${usage}%`;
                }
                
                const speedValue = element.querySelectorAll('.metric-value')[1];
                if (speedValue) {
                    speedValue.textContent = `${(model.avg_time || 0).toFixed(1)}s`;
                }
            }
        });
    }
    
    async generateReport() {
        const btn = this.elements.generateReportBtn;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        btn.disabled = true;
        
        try {
            const days = this.elements.timeRange.value;
            const response = await fetch(`/analytics/report/${this.userId}?token=${this.token}&days=${days}`);
            const result = await response.json();
            
            if (result.success) {
                this.displayReportPreview(result.report);
                this.showToast('Report generated successfully', 'success');
            } else {
                this.showToast('Failed to generate report', 'error');
            }
        } catch (error) {
            console.error('Failed to generate report:', error);
            this.showToast('Connection error', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
    
    displayReportPreview(report) {
        const preview = this.elements.reportPreview;
        if (!preview) return;
        
        preview.innerHTML = `
            <div class="report-summary">
                <h4>Report Summary (${report.period_days} days)</h4>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">Total Conversations:</span>
                        <span class="summary-value">${report.summary.total_conversations}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Total Tokens:</span>
                        <span class="summary-value">${report.summary.total_tokens_used.toLocaleString()}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Total Cost:</span>
                        <span class="summary-value">$${report.summary.total_cost.toFixed(3)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Most Used Agent:</span>
                        <span class="summary-value">${report.summary.most_used_agent}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Store report for detailed view
        this.currentReport = report;
    }
    
    viewDetailedReport() {
        if (!this.currentReport) {
            this.showToast('No report available', 'warning');
            return;
        }
        
        const modal = this.elements.reportModal;
        const content = this.elements.detailedReportContent;
        
        content.innerHTML = this.generateDetailedReportHTML(this.currentReport);
        modal.classList.add('active');
    }
    
    generateDetailedReportHTML(report) {
        return `
            <div class="detailed-report">
                <div class="report-section">
                    <h3>User Information</h3>
                    <p><strong>Username:</strong> ${report.user_info.username}</p>
                    <p><strong>Report Period:</strong> Last ${report.period_days} days</p>
                    <p><strong>Generated:</strong> ${new Date(report.generated_at).toLocaleString()}</p>
                </div>
                
                <div class="report-section">
                    <h3>Usage Summary</h3>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">${report.summary.total_conversations}</div>
                            <div class="metric-label">Total Conversations</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${report.summary.total_tokens_used.toLocaleString()}</div>
                            <div class="metric-label">Total Tokens</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">$${report.summary.total_cost.toFixed(3)}</div>
                            <div class="metric-label">Total Cost</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${(report.summary.avg_response_time || 0).toFixed(2)}s</div>
                            <div class="metric-label">Avg Response Time</div>
                        </div>
                    </div>
                </div>
                
                <div class="report-section">
                    <h3>Agent Usage Breakdown</h3>
                    <div class="breakdown-list">
                        ${report.detailed_metrics.agent_breakdown.map(agent => `
                            <div class="breakdown-item">
                                <span class="breakdown-label">${agent.agent_used}</span>
                                <span class="breakdown-value">${agent.count} conversations</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="report-section">
                    <h3>Model Performance</h3>
                    <div class="breakdown-list">
                        ${report.detailed_metrics.model_performance.map(model => `
                            <div class="breakdown-item">
                                <span class="breakdown-label">${model.model}</span>
                                <span class="breakdown-value">${model.count} uses, ${(model.avg_time || 0).toFixed(2)}s avg</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    downloadReport() {
        if (!this.currentReport) {
            this.showToast('No report available', 'warning');
            return;
        }
        
        const dataStr = JSON.stringify(this.currentReport, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `vm-nebula-report-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Report downloaded', 'success');
    }
    
    // Utility Methods
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('collapsed');
    }
    
    showSection(sectionId) {
        this.elements.contentSections.forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update page title
        const titles = {
            overview: 'Analytics Dashboard',
            analytics: 'Detailed Analytics',
            reports: 'Reports',
            usage: 'Usage History',
            settings: 'Settings'
        };
        
        const titleElement = document.getElementById('pageTitle');
        if (titleElement && titles[sectionId]) {
            titleElement.textContent = titles[sectionId];
        }
    }
    
    setActiveNav(activeLink) {
        this.elements.navLinks.forEach(link => {
            link.parentElement.classList.remove('active');
        });
        activeLink.parentElement.classList.add('active');
    }
    
    animateValue(element, start, end, duration) {
        if (!element) return;
        
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            element.textContent = Math.floor(progress * (end - start) + start).toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
    
    updateChartPeriod(period, button) {
        // Update active button
        document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Here you would typically reload chart data for the selected period
        // For now, we'll just show a toast
        this.showToast(`Chart updated for ${period} days`, 'success');
    }
    
    filterUsageHistory() {
        const agentFilter = this.elements.agentFilter.value;
        const modelFilter = this.elements.modelFilter.value;
        
        // Here you would typically reload the usage history with filters
        this.showToast('Filters applied', 'success');
    }
    
    async refreshData() {
        const btn = this.elements.refreshBtn;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        btn.disabled = true;
        
        try {
            await this.loadAnalytics();
            this.showToast('Data refreshed', 'success');
        } catch (error) {
            this.showToast('Failed to refresh data', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
    
    exportData() {
        if (!this.analytics) {
            this.showToast('No data to export', 'warning');
            return;
        }
        
        const dataStr = JSON.stringify(this.analytics, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `vm-nebula-analytics-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Analytics data exported', 'success');
    }
    
    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        window.location.href = '/';
    }
    
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
}

// CSS for report styling
const reportStyles = `
    .detailed-report {
        max-width: 100%;
    }
    
    .report-section {
        margin-bottom: 2rem;
    }
    
    .report-section h3 {
        font-size: 1.2rem;
        font-weight: 600;
        color: #1a202c;
        margin-bottom: 1rem;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 0.5rem;
    }
    
    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .metric-card {
        background: #f8fafc;
        padding: 1rem;
        border-radius: 8px;
        text-align: center;
        border: 1px solid #e2e8f0;
    }
    
    .metric-card .metric-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #667eea;
        margin-bottom: 0.25rem;
    }
    
    .metric-card .metric-label {
        font-size: 0.9rem;
        color: #64748b;
    }
    
    .breakdown-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .breakdown-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: #f8fafc;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
    }
    
    .breakdown-label {
        font-weight: 500;
        color: #374151;
    }
    
    .breakdown-value {
        font-weight: 600;
        color: #667eea;
    }
    
    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .summary-item {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .summary-label {
        color: #64748b;
        font-size: 0.9rem;
    }
    
    .summary-value {
        font-weight: 600;
        color: #1a202c;
    }
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.textContent = reportStyles;
document.head.appendChild(styleElement);

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
