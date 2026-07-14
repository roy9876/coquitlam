const chartDom = document.getElementById('chart-container');
const myChart = echarts.init(chartDom);

let animationTimer = null;
let isPlaying = true;
let years = [];
let currentYearIndex = 0;
let transitionInterval = 3500;

// Expanded robust color palette to handle 25 unique taxpayers beautifully
const colorPalette = [
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', 
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#48bfe3',
    '#5050af', '#7cb342', '#f57c00', '#d32f2f', '#00acc1',
    '#00897b', '#d81b60', '#8e24aa', '#5d4037', '#607d8b'
];
const ownerColors = {};
let colorIndex = 0;

function getStickyColor(ownerName) {
    if (!ownerName) return '#ccc';
    if (ownerColors[ownerName]) return ownerColors[ownerName];
    const assignedColor = colorPalette[colorIndex % colorPalette.length];
    ownerColors[ownerName] = assignedColor;
    colorIndex++;
    return assignedColor;
}

fetch('taxpayers.json')
    .then(response => {
        if (!response.ok) throw new Error('JSON fetch error: ' + response.statusText);
        return response.json();
    })
    .then(rawData => initializeChart(rawData))
    .catch(error => console.error('Initialization error:', error));

function initializeChart(rawData) {
    const dataMap = rawData.city_of_coquitlam_top_taxpayers;
    years = Object.keys(dataMap).sort();
    
    const formattedDataset = [["rank", "owner", "type", "levy", "year"]];
    years.forEach(year => {
        dataMap[year].forEach(item => {
            formattedDataset.push([
                item.rank,
                item.owner,
                item.type,
                item.levy,
                parseInt(year)
            ]);
        });
    });

    const startingYear = parseInt(years);
    
    const option = {
        grid: {
            top: 110,     
            bottom: 80,   
            left: 310,    
            right: 120
        },
        xAxis: {
            max: 'dataMax',
            name: 'Property Taxes Paid (CAD)', 
            nameLocation: 'middle',
            nameGap: 40,   
            nameTextStyle: {
                fontWeight: 'bold',
                fontSize: 14,
                color: '#222'
            },
            axisLabel: {
                formatter: function (value) {
                    return '$' + (value / 1000000).toFixed(1) + 'M'; 
                }
            }
        },
        yAxis: {
            type: 'category',
            inverse: true,
            max: 24, // FIXED: Expanded from 9 to 24 to cleanly draw all top 25 positions
            axisLabel: {
                show: true,
                fontSize: 15, 
                fontWeight: '500',
                color: '#333'
            },
            animationDurationUpdate: 300
        },
        dataset: [
            { id: 'dataset_raw', source: formattedDataset },
            {
                id: 'dataset_filtered',
                fromDatasetId: 'dataset_raw',
                transform: {
                    type: 'filter',
                    config: { dimension: 'year', value: startingYear }
                }
            }
        ],
        series: [
            {
                realtimeSort: true,
                type: 'bar',
                datasetIndex: 1, 
                encode: { x: 'levy', y: 'owner' },
                label: {
                    show: true,
                    position: 'right',
                    valueAnimation: true,
                    formatter: function (params) {
                        const rowData = params.value;
                        const levyValue = Array.isArray(rowData) ? rowData[3] : params.value;
                        return '$' + Number(levyValue).toLocaleString(); 
                    }
                },
                itemStyle: {
                    color: function (params) {
                        // FIXED STICKY COLORS: Safely reads the explicit row index 1 ('owner') 
                        // from the dataset grid array to lock down individual company hex colors permanently.
                        if (params.data && Array.isArray(params.data)) {
                            return getStickyColor(params.data[1]);
                        }
                        return getStickyColor(params.name);
                    }
                }
            }
        ],
        graphic: {
            elements: [
                {
                    type: 'text',
                    id: 'year_display_text', 
                    left: 'center', // Center aligned above chart
                    top: 15,       
                    style: {
                        text: startingYear,
                        font: 'bolder 72px sans-serif', 
                        fill: '#111' 
                    },
                    z: 100 
                }
            ]
        },
        animationDuration: 0,
        animationDurationUpdate: 1200, 
        animationEasing: 'linear',
        animationEasingUpdate: 'linear'
    };

    myChart.setOption(option);
    startAnimation();
}

function advanceYear() {
    currentYearIndex++;
    if (currentYearIndex >= years.length) currentYearIndex = 0; 
    
    const activeYear = parseInt(years[currentYearIndex]);
    
    myChart.setOption({
        dataset: [{
            id: 'dataset_filtered',
            transform: { type: 'filter', config: { dimension: 'year', value: activeYear } }
        }],
        graphic: {
            elements: [{
                id: 'year_display_text',
                style: { 
                    text: activeYear,
                    font: 'bolder 72px sans-serif',
                    fill: '#111'
                }
            }]
        }
    });
}

function startAnimation() {
    stopAnimation(); 
    animationTimer = setInterval(advanceYear, transitionInterval);
}

function stopAnimation() {
    clearInterval(animationTimer);
}

document.getElementById('play-pause-btn').addEventListener('click', function() {
    if (isPlaying) {
        stopAnimation();
        this.innerText = "Play";
        this.style.backgroundColor = "#3ba272";
    } else {
        startAnimation();
        this.innerText = "Pause";
        this.style.backgroundColor = "#5470c6";
    }
    isPlaying = !isPlaying;
});

document.getElementById('speed-slider').addEventListener('input', function() {
    transitionInterval = parseInt(this.value);
    document.getElementById('speed-val').innerText = (transitionInterval / 1000).toFixed(1) + 's';
    
    myChart.setOption({
        animationDurationUpdate: Math.min(transitionInterval - 300, 2000) 
    });

    if (isPlaying) {
        startAnimation();
    }
});

window.addEventListener('resize', () => myChart.resize());
