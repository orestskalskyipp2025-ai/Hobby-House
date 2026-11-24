/* Перевірка data.json: структура, унікальні id, існування зображень
   і збіг цін із калькулятором у catalog.html. Запуск: node scripts/check-data.js */
'use strict';
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const errors = [];
const ids = new Set();

data.products.forEach(function (p) {
  if (ids.has(p.id)) errors.push('Дублікат id: ' + p.id);
  ids.add(p.id);
  if (typeof p.price !== 'number' || p.price <= 0) errors.push(p.id + ': некоректна ціна');
  if (!p.title || !p.alt || !p.desc) errors.push(p.id + ': порожні title/alt/desc');
  if (!fs.existsSync(p.img)) errors.push(p.id + ': немає файлу ' + p.img);
});
if (!Array.isArray(data.reviews) || data.reviews.length < 5) errors.push('Потрібно щонайменше 5 відгуків');

const html = fs.readFileSync('catalog.html', 'utf8');
const re = /<option value="([^"]+)" data-price="(\d+)"[^>]*>(?!Стандартне|Посилене|Подарункова)/g;
let m;
while ((m = re.exec(html))) {
  const p = data.products.find(function (x) { return x.id === m[1]; });
  if (p && p.price !== Number(m[2])) errors.push('Калькулятор: ціна ' + m[1] + ' = ' + m[2] + ', у data.json ' + p.price);
}
if (errors.length) { errors.forEach(function (e) { console.error('::error::' + e); }); process.exit(1); }
console.log('data.json OK: товарів ' + data.products.length + ', відгуків ' + data.reviews.length);
