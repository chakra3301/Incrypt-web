// Mobile Device Detection and Redirect Script
(function() {
    'use strict';

    // Mobile detection function
    function isMobileDevice() {
        // Check user agent
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // Mobile device patterns
        const mobilePatterns = [
            /Android/i,
            /webOS/i,
            /iPhone/i,
            /iPad/i,
            /iPod/i,
            /BlackBerry/i,
            /Windows Phone/i,
            /Mobile/i,
            /Tablet/i
        ];

        // Check if any mobile pattern matches
        const isMobile = mobilePatterns.some(pattern => pattern.test(userAgent));

        // Additional checks for better accuracy
        const screenWidth = window.innerWidth || document.documentElement.clientWidth;
        const screenHeight = window.innerHeight || document.documentElement.clientHeight;
        
        // Check screen size (mobile typically has smaller screens)
        const isSmallScreen = screenWidth <= 768 || screenHeight <= 768;
        
        // Check touch capability
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Check if device is in mobile mode (for desktop browsers testing mobile)
        const isMobileMode = window.location.search.includes('mobile=true');
        
        // Check if user has explicitly chosen desktop version
        const forceDesktop = window.location.search.includes('desktop=true');
        
        // Check if user has already been redirected (prevent infinite loops)
        const alreadyRedirected = sessionStorage.getItem('mobileRedirected');

        // Return true if mobile device detected and no desktop override
        return (isMobile || (isSmallScreen && hasTouch)) && !forceDesktop && !alreadyRedirected;
    }

    // Function to redirect to mobile version
    function redirectToMobile() {
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        
        // Set flag to prevent infinite redirects
        sessionStorage.setItem('mobileRedirected', 'true');
        
        // Determine mobile URL based on current page
        let mobileUrl = '';
        
        if (currentPath.includes('index.html') || currentPath === '/' || currentPath === '') {
            mobileUrl = 'mobile.html';
        } else if (currentPath.includes('Encoder.html')) {
            mobileUrl = 'mobile-encoder.html'; // You can create this if needed
        } else {
            mobileUrl = 'mobile.html'; // Default to mobile home
        }
        
        // Preserve query parameters
        const separator = currentSearch ? '&' : '?';
        const mobileParam = `${separator}from=desktop`;
        
        // Redirect to mobile version
        window.location.href = mobileUrl + mobileParam;
    }

    // Function to redirect back to desktop version
    function redirectToDesktop() {
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        
        // Remove mobile redirect flag
        sessionStorage.removeItem('mobileRedirected');
        
        // Determine desktop URL based on current page
        let desktopUrl = '';
        
        if (currentPath.includes('mobile.html')) {
            desktopUrl = 'index.html';
        } else if (currentPath.includes('mobile-encoder.html')) {
            desktopUrl = 'Encoder.html';
        } else {
            desktopUrl = 'index.html'; // Default to desktop home
        }
        
        // Preserve query parameters and add desktop flag
        const separator = currentSearch ? '&' : '?';
        const desktopParam = `${separator}desktop=true`;
        
        // Redirect to desktop version
        window.location.href = desktopUrl + desktopParam;
    }

    // Check if we should redirect on page load
    if (isMobileDevice()) {
        // Small delay to ensure page is loaded
        setTimeout(redirectToMobile, 100);
    }

    // Add desktop link functionality to mobile pages
    if (window.location.pathname.includes('mobile.html')) {
        // Create desktop link in mobile header
        const header = document.querySelector('.mobile-header .header-content');
        if (header) {
            const desktopLink = document.createElement('a');
            desktopLink.href = '#';
            desktopLink.textContent = 'Desktop';
            desktopLink.style.cssText = `
                color: #00ff00;
                text-decoration: none;
                font-size: 14px;
                padding: 5px 10px;
                border: 1px solid #00ff00;
                border-radius: 15px;
                margin-left: 10px;
            `;
            desktopLink.addEventListener('click', function(e) {
                e.preventDefault();
                redirectToDesktop();
            });
            header.appendChild(desktopLink);
        }
    }

    // Expose functions globally for manual use
    window.MobileRedirect = {
        isMobileDevice: isMobileDevice,
        redirectToMobile: redirectToMobile,
        redirectToDesktop: redirectToDesktop
    };

    // Add manual redirect buttons (for testing)
    if (window.location.search.includes('debug=true')) {
        const debugDiv = document.createElement('div');
        debugDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 12px;
        `;
        debugDiv.innerHTML = `
            <div style="color: white; margin-bottom: 5px;">Debug Mode</div>
            <button onclick="MobileRedirect.redirectToMobile()" style="margin: 2px; padding: 5px;">Mobile</button>
            <button onclick="MobileRedirect.redirectToDesktop()" style="margin: 2px; padding: 5px;">Desktop</button>
        `;
        document.body.appendChild(debugDiv);
    }

})(); 