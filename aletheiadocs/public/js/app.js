document.addEventListener('DOMContentLoaded', () => {
	// Socket chat
	const socket = io();
	const chatForm = document.getElementById('chat-form');
	const chatInput = document.getElementById('chat-input');
	const chatMessages = document.getElementById('chat-messages');
	if (chatForm) {
		chatForm.addEventListener('submit', (e) => {
			e.preventDefault();
			if (!chatInput.value.trim()) return;
			socket.emit('chat:message', chatInput.value.trim());
			chatInput.value = '';
		});
		socket.on('chat:message', (msg) => {
			const div = document.createElement('div');
			div.textContent = `${msg.username}: ${msg.message}`;
			chatMessages.appendChild(div);
			chatMessages.scrollTop = chatMessages.scrollHeight;
		});
	}

	// Leaflet map
	const mapEl = document.getElementById('ph-map');
	if (mapEl) {
		const map = L.map('ph-map').setView([12.8797, 121.7740], 5.5);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '© OpenStreetMap'
		}).addTo(map);
		// Major cities markers
		const cities = [
			{ name: 'Manila', coords: [14.5995, 120.9842] },
			{ name: 'Cebu', coords: [10.3157, 123.8854] },
			{ name: 'Davao', coords: [7.1907, 125.4553] },
			{ name: 'Baguio', coords: [16.4023, 120.5960] }
		];
		cities.forEach(c => L.marker(c.coords).addTo(map).bindPopup(c.name));
	}

	// Weather
	const weatherForm = document.getElementById('weather-form');
	const weatherQ = document.getElementById('weather-q');
	const weatherResult = document.getElementById('weather-result');
	if (weatherForm) {
		weatherForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const q = weatherQ.value.trim();
			if (!q) return;
			weatherResult.textContent = 'Loading...';
			const r = await fetch(`/api/weather?q=${encodeURIComponent(q)}`);
			const data = await r.json();
			weatherResult.textContent = JSON.stringify({
				name: data.name,
				desc: data.weather?.[0]?.description,
				tempC: data.main?.temp,
				humidity: data.main?.humidity
			}, null, 2);
		});
	}
});