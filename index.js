const TelegramBot = require('node-telegram-bot-api');
const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const config = require('./config');

chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

const bot = new TelegramBot(config.telegramBotToken, { polling: true });

const chatIds = [];
let matchesHistory = [];
bot.onText(/\/start/, (msg, match) => {
    const chatId = msg.chat.id;

    if (!chatIds.includes(chatId)) chatIds.push(chatId);

    bot.sendMessage(chatId, 'Парсинг с CSGOPositive начат!');

    let curretnMatchesText = '<b>Текущие ставки:</b>\n';
    for (const match of matchesHistory) {
        curretnMatchesText += 'Событие: ' + match.text + '\n' + 'Текущий исход: ' + match.outcome + '\n\n';
    }

    bot.sendMessage(chatId, curretnMatchesText, {
        parse_mode: 'HTML'
    });
});

(async () => {
    try {
        const matches = await getMatches();
        matchesHistory = matches;

        // console.log(matchesHistory);

        setInterval(() => {
            getMatches().then((curMatches) => {
                for (const match of curMatches) {
                    const curMatch = matchesHistory.find(data => data.text === match.text);

                    if (typeof curMatch === 'undefined') {
                        for (const chatId of chatIds) {
                            let message = '<b>Новое событие</b>\n';
                            message += 'Событие: ' + match.text + '\n';
                            message += 'Текущий исход: ' + match.outcome + '\n';

                            bot.sendMessage(chatId, message, {
                                parse_mode: 'HTML'
                            });
                        }
                        continue;
                    }

                    if (curMatch.outcome !== curMatch.outcome) {
                        for (const chatId of chatIds) {
                            let message = '<b>Обновлен результат матча</b>\n';
                            message += 'Событие: ' + match.text + '\n';
                            message += 'Текущий исход: ' + match.outcome + '\n';

                            bot.sendMessage(chatId, message, {
                                parse_mode: 'HTML'
                            });
                        }
                    }
                }

                matchesHistory = curMatches;
            })
            .catch((err) => {
                for (const chatId of chatIds) {
                    bot.sendMessage(chatId, err.toString());
                }
            })

        }, 60000);
    } catch (err) {
        console.log(err);
    }
})();

function getMatches() {
    return new Promise(async (resolve, reject) => {
        try {
            let driver = await new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build();

            await driver.get(config.links[0]);

            const matchesString = (await driver.findElement(webdriver.By.className('history'))
                .findElement(webdriver.By.tagName('tbody'))
                .getAttribute('innerHTML'))
                .split('</tr>');

            const matches = await driver.findElement(webdriver.By.className('history'))
                .findElement(webdriver.By.tagName('tbody'))
                .findElements(webdriver.By.tagName('tr'));

            const result = [];
            for (let i = 0; i < matches.length; i++) {
                const match = {
                    text: (await matches[i].getText()).replace('\n', ' ')
                };

                const html = matchesString[i];
                console.log(html);

                if (html.includes('win_bet')) match.outcome = 'Win';
                else if (html.includes('lose_bet')) match.outcome = 'Lose';
                else match.outcome = 'In progress';

                result.push(match);
            }

            console.log(result);

            driver.quit();

            resolve(result);
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
}