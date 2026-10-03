/* City registry. Full data for each city is lazy-loaded from data/<id>.js */
var WP = window.WP || {};
WP.cities = [
  { id: 'hyderabad', name: 'Hyderabad', nameHi: 'हैदराबाद', blurb: 'Biryani, forts and lakeside evenings', blurbHi: 'बिरयानी, किले और झील किनारे शामें', emoji: '🕌' },
  { id: 'bengaluru', name: 'Bengaluru', nameHi: 'बेंगलुरु', blurb: 'Breweries, gardens and hill sunrises', blurbHi: 'ब्रूअरी, बगीचे और पहाड़ों पर सूर्योदय', emoji: '🌳' },
  { id: 'mumbai', name: 'Mumbai', nameHi: 'मुंबई', blurb: 'Sea face walks, street food, art deco', blurbHi: 'समुद्र किनारे सैर, स्ट्रीट फूड, आर्ट डेको', emoji: '🌊' },
  { id: 'delhi-ncr', name: 'Delhi NCR', nameHi: 'दिल्ली एनसीआर', blurb: 'Monuments, food lanes, Noida and Gurugram', blurbHi: 'स्मारक, खाने की गलियाँ, नोएडा और गुरुग्राम', emoji: '🏛️' },
  { id: 'pune', name: 'Pune', nameHi: 'पुणे', blurb: 'Forts, treks, misal and college-town cafes', blurbHi: 'किले, ट्रेक, मिसल और कॉलेज वाले कैफ़े', emoji: '⛰️' }
];
WP.data = WP.data || {};
WP._waiters = WP._waiters || {};
WP.registerCity = function (city) {
  WP.data[city.id] = city;
  (WP._waiters[city.id] || []).forEach(function (fn) { fn(city); });
  delete WP._waiters[city.id];
};
window.WP = WP;
