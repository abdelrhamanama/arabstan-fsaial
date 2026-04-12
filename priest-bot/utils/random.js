function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const blessingResults = [
  { type: 'success', text: '✨ بارك الله فيك! البركة وصلت.' },
  { type: 'success', text: '🙏 قُبلت بركتك بفضل الله!' },
  { type: 'success', text: '💫 نور البركة يملأ المكان!' },
  { type: 'fail', text: '❌ لم تُقبل البركة هذه المرة، حاول مرة أخرى.' },
  { type: 'fail', text: '😔 البركة لم تصل، تفاءل وحاول لاحقاً.' },
];

function getBlessingResult() {
  return randomChoice(blessingResults);
}

module.exports = { randomInt, randomChoice, getBlessingResult };
