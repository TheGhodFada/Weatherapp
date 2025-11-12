 // API Configuration
 const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';
 const API_KEY = 'db3b6392f3c57097025669e0c7d52252'; // Your API key

 // Weather icon mapping
 const weatherIcons = {
     '01d': 'fa-sun',
     '01n': 'fa-moon',
     '02d': 'fa-cloud-sun',
     '02n': 'fa-cloud-moon',
     '03d': 'fa-cloud',
     '03n': 'fa-cloud',
     '04d': 'fa-cloud',
     '04n': 'fa-cloud',
     '09d': 'fa-cloud-showers-heavy',
     '09n': 'fa-cloud-showers-heavy',
     '10d': 'fa-cloud-sun-rain',
     '10n': 'fa-cloud-moon-rain',
     '11d': 'fa-bolt',
     '11n': 'fa-bolt',
     '13d': 'fa-snowflake',
     '13n': 'fa-snowflake',
     '50d': 'fa-smog',
     '50n': 'fa-smog'
 };

 // App State
 let currentWeatherData = null;
 let currentForecastData = null;
 let currentLocation = null;
 let tempUnit = 'celsius'; // celsius or fahrenheit
 let windUnit = 'metric'; // metric or imperial
 let animationsEnabled = true;
 let weatherEffectsEnabled = true;
 let alertsEnabled = false;
 let dailySummaryEnabled = false;

 // Initialize app
 document.addEventListener('DOMContentLoaded', () => {
     createParticles();
     updateDateTime();
     setInterval(updateDateTime, 60000);

     // Auto-request location after 1 second
     setTimeout(() => {
         requestLocation();
     }, 1000);
 });

 // Request user location
 function requestLocation() {
     if (navigator.geolocation) {
         showLoading(true, 'Getting your location...');
         navigator.geolocation.getCurrentPosition(
             async (position) => {
                 const { latitude, longitude } = position.coords;
                 currentLocation = { lat: latitude, lon: longitude };
                 console.log('Location obtained:', latitude, longitude);
                 await getWeatherByCoords(latitude, longitude);
             },
             async (error) => {
                 console.error('Geolocation error:', error);
                 hideLoading();
                 let errorMessage = 'Location access denied. ';
                 
                 switch(error.code) {
                     case error.PERMISSION_DENIED:
                         errorMessage += 'Please allow location access in your browser settings.';
                         break;
                     case error.POSITION_UNAVAILABLE:
                         errorMessage += 'Location information is unavailable.';
                         break;
                     case error.TIMEOUT:
                         errorMessage += 'Location request timed out.';
                         break;
                     default:
                         errorMessage += 'An unknown error occurred.';
                         break;
                 }
                 
                 showError(errorMessage);
                 // Show manual options after error
                 setTimeout(() => {
                     showManualOptions();
                 }, 3000);
             },
             {
                 enableHighAccuracy: true,
                 timeout: 10000,
                 maximumAge: 300000 // 5 minutes
             }
         );
     } else {
         showError('Geolocation is not supported by your browser.');
         showManualOptions();
     }
 }

 // Skip location and show manual options
 function skipLocation() {
     showManualOptions();
 }

 // Show manual search options
 function showManualOptions() {
     document.getElementById('locationCard').style.display = 'none';
     document.getElementById('quickCities').style.display = 'block';
     document.getElementById('searchContainer').style.display = 'block';
     // Load default city
     getWeatherByCity('New York');
 }

 // Voice search
 function startVoiceSearch() {
     if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
         const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
         const recognition = new SpeechRecognition();
         
         recognition.continuous = false;
         recognition.interimResults = false;
         recognition.lang = 'en-US';
         
         recognition.onstart = () => {
             showLoading(true, 'Listening...');
         };
         
         recognition.onresult = (event) => {
             const transcript = event.results[0][0].transcript;
             document.getElementById('searchInput').value = transcript;
             hideLoading();
             searchWeather();
         };
         
         recognition.onerror = (event) => {
             console.error('Speech recognition error:', event.error);
             hideLoading();
             showError('Voice search failed. Please try again.');
         };
         
         recognition.onend = () => {
             hideLoading();
         };
         
         recognition.start();
     } else {
         showError('Voice search is not supported in your browser.');
     }
 }

 // Search weather
 async function searchWeather() {
     const searchInput = document.getElementById('searchInput');
     const cityName = searchInput.value.trim();
     
     if (cityName) {
         await getWeatherByCity(cityName);
         searchInput.value = '';
     } else {
         showError('Please enter a city name');
     }
 }

 // Get weather by city name
 async function getWeatherByCity(city) {
     showLoading(true);
     hideError();
     hideSuccess();

     try {
         console.log(`Fetching weather for: ${city}`);
         
         // Current weather
         const currentResponse = await fetch(
             `${API_BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
         );

         console.log('Current weather response status:', currentResponse.status);

         if (!currentResponse.ok) {
             const errorData = await currentResponse.json();
             throw new Error(errorData.message || `Weather data not found for ${city}`);
         }

         const currentData = await currentResponse.json();
         currentWeatherData = currentData;
         console.log('Current weather data:', currentData);
         
         // Forecast
         const forecastResponse = await fetch(
             `${API_BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
         );

         if (!forecastResponse.ok) {
             throw new Error('Forecast data not available');
         }

         const forecastData = await forecastResponse.json();
         currentForecastData = forecastData;

         // Hide location card and show weather
         document.getElementById('locationCard').style.display = 'none';
         document.getElementById('quickCities').style.display = 'block';
         document.getElementById('searchContainer').style.display = 'block';

         // Update UI
         updateWeatherUI(currentData);
         updateExtendedForecastUI(forecastData);
         updateSunMoonTimes(currentData);
         updateAirQuality(currentData);
         
         showWeatherCard(true);
         showSuccess(`Weather loaded successfully for ${city}!`);
     } catch (error) {
         console.error('Error fetching weather:', error);
         showError(error.message);
     } finally {
         hideLoading();
     }
 }

 // Get weather by coordinates
 async function getWeatherByCoords(lat, lon) {
     showLoading(true);
     hideError();
     hideSuccess();

     try {
         console.log(`Fetching weather for coordinates: ${lat}, ${lon}`);
         
         // Current weather
         const currentResponse = await fetch(
             `${API_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
         );

         if (!currentResponse.ok) {
             throw new Error('Weather data not found for your location');
         }

         const currentData = await currentResponse.json();
         currentWeatherData = currentData;
         console.log('Current weather data from coords:', currentData);
         
         // Forecast
         const forecastResponse = await fetch(
             `${API_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
         );

         if (!forecastResponse.ok) {
             throw new Error('Forecast data not available');
         }

         const forecastData = await forecastResponse.json();
         currentForecastData = forecastData;

         // Hide location card and show weather
         document.getElementById('locationCard').style.display = 'none';
         document.getElementById('quickCities').style.display = 'block';
         document.getElementById('searchContainer').style.display = 'block';

         // Update UI
         updateWeatherUI(currentData);
         updateExtendedForecastUI(forecastData);
         updateSunMoonTimes(currentData);
         updateAirQuality(currentData);
         
         showWeatherCard(true);
         showSuccess(`Weather loaded for your location!`);
     } catch (error) {
         console.error('Error fetching weather by coordinates:', error);
         showError(error.message);
         showManualOptions();
     } finally {
         hideLoading();
     }
 }

 // Update weather UI
 function updateWeatherUI(data) {
     // Location
     document.getElementById('cityName').textContent = 
         `${data.name}, ${data.sys.country}`;

     // Temperature
     const temp = tempUnit === 'fahrenheit' ? 
         Math.round(data.main.temp * 9/5 + 32) : 
         Math.round(data.main.temp);
     document.getElementById('temp').textContent = temp;
     
     const feelsLike = tempUnit === 'fahrenheit' ? 
         Math.round(data.main.feels_like * 9/5 + 32) : 
         Math.round(data.main.feels_like);
     document.getElementById('feelsLike').textContent = 
         `${feelsLike}°${tempUnit === 'fahrenheit' ? 'F' : 'C'}`;

     // Weather description
     document.getElementById('weatherDesc').textContent = 
         data.weather[0].description;

     // Weather icon
     const iconCode = data.weather[0].icon;
     const iconClass = weatherIcons[iconCode] || 'fa-sun';
     document.getElementById('weatherIcon').className = `fas ${iconClass}`;

     // Details
     const windSpeed = windUnit === 'imperial' ? 
         Math.round(data.wind.speed * 2.237) : 
         data.wind.speed;
     document.getElementById('windSpeed').textContent = 
         `${windSpeed} ${windUnit === 'imperial' ? 'mph' : 'm/s'}`;
         
     document.getElementById('humidity').textContent = 
         `${data.main.humidity}%`;
     document.getElementById('pressure').textContent = 
         `${data.main.pressure} hPa`;
     document.getElementById('visibility').textContent = 
         `${(data.visibility / 1000).toFixed(1)} km`;

     // Update theme based on weather
     updateTheme(data.weather[0].main, iconCode);

     // Get UV index
     getUVIndex(data.coord.lat, data.coord.lon);
 }

 // Update extended forecast UI
 function updateExtendedForecastUI(data) {
     // Daily forecast
     const dailyForecast = document.getElementById('dailyForecast');
     dailyForecast.innerHTML = '';

     const dailyForecasts = processForecastData(data.list);

     dailyForecasts.forEach(forecast => {
         const forecastDay = document.createElement('div');
         forecastDay.className = 'forecast-day';
         
         const date = new Date(forecast.dt * 1000);
         const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
         const iconCode = forecast.weather[0].icon;
         const iconClass = weatherIcons[iconCode] || 'fa-sun';

         const temp = tempUnit === 'fahrenheit' ? 
             Math.round(forecast.main.temp * 9/5 + 32) : 
             Math.round(forecast.main.temp);
             
         const tempMin = tempUnit === 'fahrenheit' ? 
             Math.round(forecast.main.temp_min * 9/5 + 32) : 
             Math.round(forecast.main.temp_min);
             
         const tempMax = tempUnit === 'fahrenheit' ? 
             Math.round(forecast.main.temp_max * 9/5 + 32) : 
             Math.round(forecast.main.temp_max);

         forecastDay.innerHTML = `
             <div class="forecast-day-name">${dayName}</div>
             <div class="forecast-icon">
                 <i class="fas ${iconClass}"></i>
             </div>
             <div class="forecast-temp">${temp}°</div>
             <div class="forecast-temp-range">
                 ${tempMin}° / ${tempMax}°
             </div>
         `;

         dailyForecast.appendChild(forecastDay);
     });

     // Hourly forecast
     const hourlyForecast = document.getElementById('hourlyForecast');
     hourlyForecast.innerHTML = '';

     // Get next 24 hours
     const next24Hours = data.list.slice(0, 8);

     next24Hours.forEach(forecast => {
         const hourlyItem = document.createElement('div');
         hourlyItem.className = 'hourly-item';
         
         const date = new Date(forecast.dt * 1000);
         const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
         const iconCode = forecast.weather[0].icon;
         const iconClass = weatherIcons[iconCode] || 'fa-sun';

         const temp = tempUnit === 'fahrenheit' ? 
             Math.round(forecast.main.temp * 9/5 + 32) : 
             Math.round(forecast.main.temp);

         hourlyItem.innerHTML = `
             <div class="hourly-time">${time}</div>
             <div class="hourly-icon">
                 <i class="fas ${iconClass}"></i>
             </div>
             <div class="hourly-temp">${temp}°</div>
         `;

         hourlyForecast.appendChild(hourlyItem);
     });
 }

 // Update sun and moon times
 function updateSunMoonTimes(data) {
     // Sunrise and sunset from API
     const sunrise = new Date(data.sys.sunrise * 1000);
     const sunset = new Date(data.sys.sunset * 1000);
     
     document.getElementById('sunrise').textContent = 
         sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
     document.getElementById('sunset').textContent = 
         sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
     
     // Mock moon data (would need additional API for real data)
     const moonrise = new Date();
     moonrise.setHours(22, 0, 0);
     const moonset = new Date();
     moonset.setHours(6, 0, 0);
     
     document.getElementById('moonrise').textContent = 
         moonrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
     document.getElementById('moonset').textContent = 
         moonset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
 }

 // Update air quality
 function updateAirQuality(data) {
     // Mock air quality data (would need additional API for real data)
     const airQualityValue = Math.floor(Math.random() * 150) + 1;
     let airQualityLabel = '';
     let airQualityClass = '';
     
     if (airQualityValue <= 50) {
         airQualityLabel = 'Good';
         airQualityClass = 'air-quality-good';
     } else if (airQualityValue <= 100) {
         airQualityLabel = 'Moderate';
         airQualityClass = 'air-quality-moderate';
     } else if (airQualityValue <= 150) {
         airQualityLabel = 'Unhealthy for Sensitive';
         airQualityClass = 'air-quality-unhealthy';
     } else {
         airQualityLabel = 'Unhealthy';
         airQualityClass = 'air-quality-very-unhealthy';
     }
     
     document.getElementById('airQualityValue').textContent = airQualityValue;
     document.getElementById('airQualityLabel').textContent = airQualityLabel;
     
     const airQualityFill = document.getElementById('airQualityFill');
     airQualityFill.className = `air-quality-fill ${airQualityClass}`;
     airQualityFill.style.width = `${Math.min(airQualityValue / 200 * 100, 100)}%`;
 }

 // Switch forecast tabs
 function switchForecastTab(tab) {
     // Update tab styles
     document.querySelectorAll('.forecast-tab').forEach(forecastTab => {
         forecastTab.classList.remove('active');
     });
     event.target.classList.add('active');
     
     // Show/hide content
     document.getElementById('dailyForecast').style.display = tab === 'daily' ? 'grid' : 'none';
     document.getElementById('hourlyForecast').style.display = tab === 'hourly' ? 'flex' : 'none';
     document.getElementById('weatherRadar').style.display = tab === 'radar' ? 'block' : 'none';
 }

 // Get UV Index
 async function getUVIndex(lat, lon) {
     try {
         const response = await fetch(
             `${API_BASE_URL}/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`
         );
         
         if (response.ok) {
             const data = await response.json();
             document.getElementById('uvIndex').textContent = data.value || '--';
         } else {
             document.getElementById('uvIndex').textContent = '--';
         }
     } catch (error) {
         console.error('Error fetching UV index:', error);
         document.getElementById('uvIndex').textContent = '--';
     }
 }

 // Process forecast data
 function processForecastData(list) {
     const dailyForecasts = [];
     const processedDays = new Set();

     list.forEach(item => {
         const date = new Date(item.dt * 1000);
         const dayKey = date.toDateString();

         if (!processedDays.has(dayKey) && dailyForecasts.length < 5) {
             dailyForecasts.push(item);
             processedDays.add(dayKey);
         }
     });

     return dailyForecasts;
 }

 // Update theme and weather effects
 function updateTheme(weatherMain, iconCode) {
     const weatherBg = document.getElementById('weatherBg');
     weatherBg.className = 'weather-bg';
     
     const body = document.body;
     body.className = '';

     const hour = new Date().getHours();
     const isNight = hour >= 20 || hour < 6;

     if (iconCode.includes('n')) {
         weatherBg.classList.add('night');
         body.classList.add('night');
     } else if (weatherMain.toLowerCase().includes('clear')) {
         weatherBg.classList.add('sunny');
         body.classList.add('sunny');
     } else if (weatherMain.toLowerCase().includes('cloud')) {
         weatherBg.classList.add('cloudy');
         body.classList.add('cloudy');
     } else if (weatherMain.toLowerCase().includes('rain')) {
         weatherBg.classList.add('rainy');
         body.classList.add('rainy');
         if (weatherEffectsEnabled) {
             createRainEffect();
         }
     } else if (weatherMain.toLowerCase().includes('snow')) {
         weatherBg.classList.add('snowy');
         body.classList.add('snowy');
         if (weatherEffectsEnabled) {
             createSnowEffect();
         }
     } else if (weatherMain.toLowerCase().includes('thunderstorm')) {
         weatherBg.classList.add('thunderstorm');
         body.classList.add('thunderstorm');
     } else if (isNight) {
         weatherBg.classList.add('night');
         body.classList.add('night');
     }
 }

 // Create rain effect
 function createRainEffect() {
     const weatherElements = document.getElementById('weatherElements');
     weatherElements.innerHTML = '';
     
     if (!weatherEffectsEnabled) return;
     
     for (let i = 0; i < 100; i++) {
         const rainDrop = document.createElement('div');
         rainDrop.className = 'rain-drop';
         rainDrop.style.left = Math.random() * 100 + '%';
         rainDrop.style.animationDuration = Math.random() * 1 + 0.5 + 's';
         rainDrop.style.animationDelay = Math.random() * 2 + 's';
         weatherElements.appendChild(rainDrop);
     }
 }

 // Create snow effect
 function createSnowEffect() {
     const weatherElements = document.getElementById('weatherElements');
     weatherElements.innerHTML = '';
     
     if (!weatherEffectsEnabled) return;
     
     for (let i = 0; i < 50; i++) {
         const snowFlake = document.createElement('div');
         snowFlake.className = 'snow-flake';
         snowFlake.style.left = Math.random() * 100 + '%';
         snowFlake.style.animationDuration = Math.random() * 3 + 2 + 's';
         snowFlake.style.animationDelay = Math.random() * 2 + 's';
         snowFlake.style.opacity = Math.random() * 0.8 + 0.2;
         weatherElements.appendChild(snowFlake);
     }
 }

 // Clear weather effects
 function clearWeatherEffects() {
     document.getElementById('weatherElements').innerHTML = '';
 }

 // Settings functions
 function toggleSettings() {
     const settingsPanel = document.getElementById('settingsPanel');
     settingsPanel.classList.toggle('open');
 }

 function toggleTempUnit() {
     const toggle = document.getElementById('tempUnitToggle');
     toggle.classList.toggle('active');
     
     tempUnit = tempUnit === 'celsius' ? 'fahrenheit' : 'celsius';
     
     // Update existing weather data if available
     if (currentWeatherData) {
         updateWeatherUI(currentWeatherData);
     }
     
     if (currentForecastData) {
         updateExtendedForecastUI(currentForecastData);
     }
 }

 function toggleWindUnit() {
     const toggle = document.getElementById('windUnitToggle');
     toggle.classList.toggle('active');
     
     windUnit = windUnit === 'metric' ? 'imperial' : 'metric';
     
     // Update existing weather data if available
     if (currentWeatherData) {
         updateWeatherUI(currentWeatherData);
     }
 }

 function toggleAnimations() {
     const toggle = document.getElementById('animationsToggle');
     toggle.classList.toggle('active');
     
     animationsEnabled = !animationsEnabled;
     
     // Toggle CSS animations
     const style = document.createElement('style');
     style.innerHTML = animationsEnabled ? '' : '* { animation: none !important; transition: none !important; }';
     document.head.appendChild(style);
 }

 function toggleWeatherEffects() {
     const toggle = document.getElementById('weatherEffectsToggle');
     toggle.classList.toggle('active');
     
     weatherEffectsEnabled = !weatherEffectsEnabled;
     
     if (weatherEffectsEnabled && currentWeatherData) {
         updateTheme(currentWeatherData.weather[0].main, currentWeatherData.weather[0].icon);
     } else {
         clearWeatherEffects();
     }
 }

 function toggleAlerts() {
     const toggle = document.getElementById('alertsToggle');
     toggle.classList.toggle('active');
     
     alertsEnabled = !alertsEnabled;
     
     if (alertsEnabled) {
         showSuccess('Weather alerts enabled');
         // Request notification permission
         if ('Notification' in window && Notification.permission === 'default') {
             Notification.requestPermission();
         }
     } else {
         showSuccess('Weather alerts disabled');
     }
 }

 function toggleDailySummary() {
     const toggle = document.getElementById('dailySummaryToggle');
     toggle.classList.toggle('active');
     
     dailySummaryEnabled = !dailySummaryEnabled;
     
     showSuccess(dailySummaryEnabled ? 'Daily summary enabled' : 'Daily summary disabled');
 }

 function refreshWeather() {
     if (currentLocation) {
         getWeatherByCoords(currentLocation.lat, currentLocation.lon);
     } else if (currentWeatherData) {
         getWeatherByCity(currentWeatherData.name);
     } else {
         requestLocation();
     }
 }

 function toggleFullscreen() {
     if (!document.fullscreenElement) {
         document.documentElement.requestFullscreen();
     } else {
         document.exitFullscreen();
     }
 }

 // UI Helper Functions
 function showLoading(show, text = 'Loading weather data...') {
     const loading = document.getElementById('loading');
     const loadingText = document.getElementById('loadingText');
     if (show) {
         loading.classList.add('active');
         loadingText.textContent = text;
     } else {
         loading.classList.remove('active');
     }
 }

 function hideLoading() {
     const loading = document.getElementById('loading');
     loading.classList.remove('active');
 }

 function showWeatherCard(show) {
     const weatherGrid = document.getElementById('weatherGrid');
     const extendedForecast = document.getElementById('extendedForecast');
     
     if (show) {
         weatherGrid.style.display = 'grid';
         extendedForecast.style.display = 'block';
     } else {
         weatherGrid.style.display = 'none';
         extendedForecast.style.display = 'none';
     }
 }

 function showError(message) {
     const errorElement = document.getElementById('errorMessage');
     errorElement.textContent = message;
     errorElement.classList.add('show');
     setTimeout(() => {
         errorElement.classList.remove('show');
     }, 5000);
 }

 function showSuccess(message) {
     const successElement = document.getElementById('successMessage');
     successElement.textContent = message;
     successElement.classList.add('show');
     setTimeout(() => {
         successElement.classList.remove('show');
     }, 3000);
 }

 function hideError() {
     const errorElement = document.getElementById('errorMessage');
     errorElement.classList.remove('show');
 }

 function hideSuccess() {
     const successElement = document.getElementById('successMessage');
     successElement.classList.remove('show');
 }

 function updateDateTime() {
     const now = new Date();
     const options = { 
         weekday: 'long', 
         year: 'numeric', 
         month: 'long', 
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
     };
     document.getElementById('dateTime').textContent = now.toLocaleDateString('en-US', options);
 }

 function createParticles() {
     const particlesContainer = document.getElementById('particles');
     for (let i = 0; i < 50; i++) {
         const particle = document.createElement('div');
         particle.className = 'particle';
         particle.style.left = Math.random() * 100 + '%';
         particle.style.animationDelay = Math.random() * 15 + 's';
         particle.style.animationDuration = (15 + Math.random() * 10) + 's';
         particlesContainer.appendChild(particle);
     }
 }

 // Handle Enter key in search
 document.getElementById('searchInput').addEventListener('keypress', function(e) {
     if (e.key === 'Enter') {
         searchWeather();
     }
 });