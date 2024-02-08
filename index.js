const fs = require('fs');
const randomString = () => {
  const length =
    Math.floor(
      Math.random() * (Math.sqrt(131072) - Math.sqrt(1024) + 1) + Math.sqrt(1024)
    ) *
      2; // Generate a random length between 16 and 128 (sqrt(131072) - sqrt(1024) + 1 = 128 - 16 + 1)
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result +=
      characters[
        Math.floor(
          Math.random() * (characters.length - 1 - 0 + 1) + 0
        )
      ];
  }
  return result;
};

const mineflayer = require('mineflayer');
const crypto = require('crypto');
const axios = require('axios');
const os = require('os');
const developerHashesFile = './dev.db';

const developerHashes = fs
  .readFileSync(developerHashesFile, 'utf-8')
  .split('\n')
  .filter((line) => line.trim().length > 0)
  .map((line) => line.trim());

const developerHashStore = {};

const generateHash = (username) => {
  const randomSalt = Math.random()
    .toString(36)
    .substring(2, 15); // Generate a random salt
  let hash = username + randomSalt;
  const randomRounds = Math.floor(
    Math.random() * (Math.pow(2, 16) - Math.pow(2, 4) + 1) + Math.pow(2, 4)
  ); // Generates a random number between 16 and 256 (2^16 - 2^4 + 1 = 256 - 16 + 1)
  for (let i = 0; i < randomRounds; i++) {
    hash = crypto.createHash('sha256').update(hash).digest('hex');
  }
  return hash;
};

const getUsername = async (uuid) =>
  (await axios.get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)).data.name;

const printDeveloperHashes = async () => {
  for (let i = 0; i < developerHashes.length; i += 2) {
    const developerHash = developerHashes[i];
    developerHashStore[developerHash] = true;
    console.log(`Developer key ${Math.floor((i + 1) / 2)} generated: ${developerHash}`);
  }
};

const validateDeveloperHash = (hash) => {
  if (developerHashStore[hash]) {
    return true;
  }
  return false;
};

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 6969,
  username: randomString(),
  auth: 'offline'
});

bot.on('spawn', () => {
  console.log('Bot has spawned (or respawned)');
  printDeveloperHashes(); // Generate developer hashes
});

bot.on('chat', (username, message) => {
  if (username === bot.username) {
    return; // Ignore messages sent by the bot
  }
  console.log(`<${username}> ${message}`); // Log chat messages
  const [command, arg1, arg2] = message.split(' ');

  if (command === 'a!auth') {
    if (validateDeveloperHash(arg1)) {
      bot.chat(`Developer authenticated.`);
      bot.developer = true; // Mark the user as a developer
    } else {
      // Only display the access denied message for invalid 'a!hash' commands
      if (message.toLowerCase().startsWith('a!auth')) {
        bot.chat(`Failed to authenticate as a developer. (Do you have the correct developer key?)`);
      }
    }
  } else if (message.toLowerCase().startsWith('a!') || message.toLowerCase().startsWith('w!')) {
    if (bot.developer || validateDeveloperHash(developerHashStore[username])) {
      if (command === 'a!echo') {
        const messageToSend = arg1.startsWith('c:') ? arg1.slice(2) : arg1;
        const times = Number(arg2) || 1;
        for (let i = 0; i < times; i++) {
          bot.chat(messageToSend);
        }
      } else if (command === 'a!placeCommandBlock') {
        // ... (Existing code for 'a!placeCommandBlock')
      } else if (command === 'a!bi') {
        bot.chat(`Host name: ${os.hostname()}`); // Fix reference to hostname
        bot.chat(`User Profile: ${os.userInfo().username}`);
        bot.chat(`Engine: Mineflayer`);
        bot.chat(`OS: ${os.type()}`);
        bot.chat(`Kernel: ${os.platform() === 'win32' ? os.release().match(/^(\d+\.){2}\d+/)?.[0] : os.release()}`);
        bot.chat(`Architecture: ${os.arch()}`);
        bot.chat(`CPU Model: ${os.cpus()[0].model}`);
        bot.chat(`Number of Threads: ${os.cpus().length}`);
        bot.chat(`Total RAM: ${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(2)} GB`); // Convert to GB
        bot.chat(`Unused RAM: ${(os.freemem() / (1024 * 1024 * 1024)).toFixed(2)} GB`); // Convert to GB
      } else if (command === 'a!guhash') {
        const userToGenerateFor = message.split(' ')[1];
        if (bot.developer) {
          const userHash = generateHash(userToGenerateFor);
          bot.chat(`/tell ${username} Your one-time access key: ${userHash}`);
        } else {
          bot.chat('Access denied. Only developers can generate user keys.');
        }
      } else {
        bot.chat('Unknown command.');
      }
    } else {
      bot.chat(`Access denied. Please use the "a!auth" command to authenticate as a developer.`);
    }
  } else if (username === bot.username && message.toLowerCase().startsWith('a!auth')) {
    bot.chat(`You're already authenticated, silly! ${bot.username}`);
  }
});