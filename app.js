async function loadDashboard() {
    const [finRes, popRes] = await Promise.all([fetch('coquitlam_stats.json'), fetch('bc_pop.json')]);
    const finData = await finRes.json();
    const popData = await popRes.json();

    const master = finData.city_of_coquitlam_master_financial_data;
    const populations = popData.bc_municipal_population_estimates.Coquitlam;
    const years = ["2019", "2020", "2021", "2022", "2023", "2024", "2025"];

    const safeSum = (obj, yr) => Object.values(obj).reduce((a, b) => a + (b[yr] || 0), 0);

    // --- CHART 1: OPERATING TRENDS (Bar Line Combo Chart) ---
    const rev = master.consolidated_operations_by_service_area.revenues;
    const exp = master.consolidated_operations_by_service_area.expenses;
    new Chart(document.getElementById('opTrendChart'), {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                { label: 'Surplus ($000s)', data: years.map(yr => rev.total_revenue[yr] - exp.total_expenses[yr]), type: 'line', borderColor: '#3498db', order: 1 },
                { label: 'Total Revenue ($000s)', data: years.map(yr => rev.total_revenue[yr]), backgroundColor: '#a9dfbf', order: 2 },
                { label: 'Total Expenses ($000s)', data: years.map(yr => exp.total_expenses[yr]), backgroundColor: '#f5b7b1', order: 3 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // --- CHART 2: PER RESIDENT ANALYSIS (Line Chart with Multiple Series) ---
    const userRates = master.segmented_operations_by_object.revenue_items.user_rates;
    new Chart(document.getElementById('taxPerResChart'), {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                { label: 'Total (Tax+User)', data: years.map(yr => ((rev.taxation[yr] + userRates[yr]) * 1000 / populations[yr]).toFixed(2)), borderColor: '#2c3e50', borderWidth: 3 },
                { label: 'Taxation Only', data: years.map(yr => (rev.taxation[yr] * 1000 / populations[yr]).toFixed(2)), borderColor: '#8e44ad', backgroundColor: 'rgba(142, 68, 173, 0.1)', fill: false },
                { label: 'User Rates Only', data: years.map(yr => (userRates[yr] * 1000 / populations[yr]).toFixed(2)), borderColor: '#e67e22' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // --- CHART 3: BALANCE SHEET (ASSETS VS LIABILITIES) (Stacked Bar Chart with Groups) ---
    const pos = master.consolidated_financial_position;
    new Chart(document.getElementById('balanceSheetChart'), {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                { label: 'Financial Assets', data: years.map(yr => safeSum(pos.financial_assets, yr)), stack: '0', backgroundColor: '#3498db' },
                { label: 'Non-Financial Assets', data: years.map(yr => safeSum(pos.non_financial_assets, yr)), stack: '0', backgroundColor: '#85c1e9' },
                { label: 'Total Liabilities', data: years.map(yr => safeSum(pos.liabilities, yr)), stack: '1', backgroundColor: '#e74c3c' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { stacked: true, ticks: { callback: v => '$' + (v/1000000).toFixed(1) + 'B' }, title: { display: true, text: 'Billions' } }, x: { stacked: true } },
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // --- CHART 4: AVERAGE RATE COMPARISONS (Line Style Chart) ---
    // Hardcoded spreadsheet values
    const avgYield = [0.0267, 0.0269, 0.0215, 0.0259, 0.0357, 0.0401, 0.0434];
    const debtRate = [0.0374, 0.0378, 0.0379, 0.0381, 0.0382, 0.0414, 0.0426];
    const repoRate = [0.0175, 0.0045, 0.0025, 0.0221, 0.0478, 0.044, 0.0265];

    new Chart(document.getElementById('yieldChart'), {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                { 
                    label: 'Weighted Average Interest Rate (Debt)', 
                    data: debtRate.map(v => (v * 100).toFixed(2)), 
                    borderColor: '#e91e63', // The standard Material Design Pink
                    backgroundColor: 'rgba(233, 30, 99, 0.1)', 
                    fill: true, 
                    tension: 0.3

                },
                { 
                    label: 'Average Investment Portfolio Yield', 
                    data: avgYield.map(v => (v * 100).toFixed(2)), 
                    borderColor: '#2ecc71', 
                    borderWidth: 3, 
                    fill: false, 
                    tension: 0.3 
                },
                { 
                    label: 'Canada Overnight Repo Rate Average', 
                    data: repoRate.map(v => (v * 100).toFixed(2)), 
                    borderColor: '#f1c40f', // Sun Flower Yellowish
                    borderDash: [3], // Creates the dashed effect
                    fill: false, 
                    tension: 0.3 
                }
            ]
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            scales: { y: { ticks: { callback: v => v + '%' }, title: { display: true, text: 'Percentage (%)' } } },
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // --- CHART 5: TAX CONCENTRATION (Multiple y-axis Area Chart with a Line) --- 
    const top25 = master.corporate_taxpayer_analysis.top_25_total_levy_actual;
    const c5Years = years.filter(yr => top25[yr] !== null);
    new Chart(document.getElementById('taxConcentrationChart'), {
        type: 'line',
        data: {
            labels: c5Years,
            datasets: [
                { label: 'LEFT: Top 25 Tax Levy ($)', data: c5Years.map(yr => top25[yr]), yAxisID: 'y', fill: true, backgroundColor: 'rgba(52, 15, 219, 0.1)' },
                { label: 'RIGHT: Large Tax Concentration (%)', data: c5Years.map(yr => (top25[yr] / ((rev.taxation[yr] + userRates[yr]) * 1000) * 100).toFixed(2)), yAxisID: 'y1', borderColor: '#8a7355', borderWidth: 2 }
            ]
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            scales: { y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: v => v + '%' } } } 
        }
    });

    // --- CHART 6: SPECIAL ITEMS OF INTEREST (Horizontal Bar) ---
    const si = master.segmented_operations_by_object.revenue_items;
    new Chart(document.getElementById('specialItemsChart'), {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                { label: 'Municipal Land Sale ', data: years.map(yr => si.municipal_land_sale[yr]), backgroundColor: '#34495e' },
                { label: 'Casino Host Revenue ', data: years.map(yr => si.casino_host_revenue[yr]), backgroundColor: '#f1c40f' }
            ]
        },
        options: { 
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            scales: { x: { title: { display: true, text: 'in thousands of dollars' }, ticks: { callback: v => '$' + v.toLocaleString() + ' ' } } }
        }
    });
}
loadDashboard();