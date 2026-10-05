// Every place that serves food states all five diet facts, so students never have to guess what a blank means.
export const DIET = [['nonveg', 'Non-veg'], ['veg', 'Vegetarian'], ['vegan', 'Vegan'], ['gf', 'Gluten-free'], ['halal', 'Halal']];
export const DIET_STATUS = {yes: 'Yes', options: 'Options', no: 'None', ask: 'Ask staff'};
export const servesFood = place => ['Food & drink', 'Cafes'].includes(place.category);
export const dietMatches = (place, key) => ['yes', 'options'].includes(place.diet?.[key]);
export const dietWords = place => DIET.filter(([key]) => dietMatches(place, key)).map(([, label]) => label).join(' ');
