$(document).ready(function () {
    let currentSymbol = null;
    let pollingInterval = null;

    // Show/Hide loading overlay
    function toggleLoading(show) {
        $('#loading-overlay').toggleClass('d-none', !show);
    }

    // Format number with commas and decimals
    function formatNumber(num) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    }

    // Format large numbers (e.g., volume)
    function formatLargeNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        }
        return num.toString();
    }

    // Calculate percentage change
    function calculateChange(current, previous) {
        const change = ((current - previous) / previous) * 100;
        return change.toFixed(2);
    }

    // Search for stocks with debouncing
    let searchTimeout;
    $('#search-input').on('input', function() {
        clearTimeout(searchTimeout);
        const keywords = $(this).val().trim();
        
        if (keywords.length < 2) {
            $('#search-results').empty();
            return;
        }

        searchTimeout = setTimeout(() => performSearch(keywords), 500);
    });

    $('#search-btn').click(function() {
        const keywords = $('#search-input').val().trim();
        if (keywords) {
            performSearch(keywords);
        }
    });

    function performSearch(keywords) {
        toggleLoading(true);
        
        $.ajax({
            url: "/search",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ keywords }),
            success: function(response) {
                if (response.status === "success") {
                    displaySearchResults(response.results);
                } else {
                    showError('#search-results', response.message);
                }
            },
            error: function() {
                showError('#search-results', 'Error occurred while searching.');
            },
            complete: function() {
                toggleLoading(false);
            }
        });
    }

    function displaySearchResults(results) {
        if (!results.length) {
            $('#search-results').html(
                '<div class="alert alert-info">No stocks found matching your search.</div>'
            );
            return;
        }

        let html = '<div class="list-group fade-in">';
        results.forEach((item) => {
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${item.symbol}</strong>
                            <small class="text-muted d-block">${item.instrument_name}</small>
                        </div>
                        <button class="btn btn-outline-primary btn-sm track-btn" 
                                data-symbol="${item.symbol}">
                            <i class="fas fa-chart-line me-1"></i>Track
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        $('#search-results').html(html);
    }

    // Track real-time stock data
    $(document).on('click', '.track-btn', function() {
        const symbol = $(this).data('symbol');
        
        // Reset previous tracking
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        
        currentSymbol = symbol;
        $(this).prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
        
        fetchRealtimeData();
        pollingInterval = setInterval(fetchRealtimeData, 60000);
    });

    function fetchRealtimeData() {
        if (!currentSymbol) return;

        $.ajax({
            url: `/realtime/${currentSymbol}`,
            method: "GET",
            success: function(response) {
                if (response.status === "success") {
                    displayRealtimeData(response.data);
                } else {
                    showError('#realtime-container', response.message);
                }
            },
            error: function() {
                showError('#realtime-container', 'Error fetching real-time data.');
            },
            complete: function() {
                $('.track-btn').prop('disabled', false)
                    .html('<i class="fas fa-chart-line me-1"></i>Track');
            }
        });
    }

    function displayRealtimeData(data) {
        const changePercent = calculateChange(data.close, data.open);
        const changeClass = changePercent >= 0 ? 'text-success' : 'text-danger';
        const changeIcon = changePercent >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        const changeBadgeClass = changePercent >= 0 ? 'bg-success' : 'bg-danger'; // Badge for status
    
        // Color change logic for stock data items
        const priceChangeColor = changePercent >= 0 ? 'bg-light-success' : 'bg-light-danger'; // Color for price-related items
        const volumeColor = data.volume > 1000000 ? 'bg-light-primary' : 'bg-light-secondary'; // Volume color based on a threshold
    
        // Format datetime to the desired format (e.g., "Friday, January 17, 2025, 3:59:00 PM")
        const formattedDatetime = new Date(data.datetime).toLocaleString('en-US', {
            weekday: 'long', // e.g., Friday
            year: 'numeric', // e.g., 2025
            month: 'long', // e.g., January
            day: 'numeric', // e.g., 17
            hour: '2-digit', // e.g., 3 PM
            minute: '2-digit', // e.g., 59
            second: '2-digit', // e.g., 00
            hour12: true // AM/PM format
        });
    
        const html = `
            <div class="fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3>SYMBOL : ${currentSymbol}</h3>
                    <span class="badge ${changeBadgeClass}">${formattedDatetime}</span>
                </div>
                
                <div class="stock-data-grid mb-4">
                    <div class="stock-data-item ${priceChangeColor}">
                        <small class="text-muted d-block">Current Price</small>
                        <h4 class="mb-0">$${formatNumber(data.close)}</h4>
                        <small class="${changeClass}">
                            <i class="fas ${changeIcon}"></i> ${Math.abs(changePercent)}%
                        </small>
                    </div>
                    
                    <div class="stock-data-item ${priceChangeColor}">
                        <small class="text-muted d-block">Open</small>
                        <h4 class="mb-0">$${formatNumber(data.open)}</h4>
                    </div>
                    
                    <div class="stock-data-item ${priceChangeColor}">
                        <small class="text-muted d-block">High</small>
                        <h4 class="mb-0">$${formatNumber(data.high)}</h4>
                    </div>
                    
                    <div class="stock-data-item ${priceChangeColor}">
                        <small class="text-muted d-block">Low</small>
                        <h4 class="mb-0">$${formatNumber(data.low)}</h4>
                    </div>
                    
                    <div class="stock-data-item ${volumeColor}">
                        <small class="text-muted d-block">Volume</small>
                        <h4 class="mb-0">${formatLargeNumber(data.volume)}</h4>
                    </div>
                </div>
            </div>
        `;
        
        $('#realtime-container').html(html);
    }
    

    function showError(container, message) {
        $(container).html(`
            <div class="alert alert-danger fade-in">
                <i class="fas fa-exclamation-circle me-2"></i>${message}
            </div>
        `);
    }
});
