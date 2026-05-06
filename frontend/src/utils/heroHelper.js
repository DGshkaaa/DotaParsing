import axios from 'axios';

let heroMap = {};

export const initHeroMap = async () => {
    try {
        const res = await axios.get('http://127.0.0.1:8000/heroes');
        heroMap = res.data; // Зберігаємо об'єкт, де ключ - це ID
    } catch (e) {
        console.error("Не вдалося завантажити словник героїв");
    }
};

export const getHeroData = (id) => {
    return heroMap[id] || { localized_name: `Hero ${id}`, img: "" };
};