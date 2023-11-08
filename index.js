const randomString = () => Math.random().toString(36).substring(2, 10); // Generate a random username

const mineflayer = require('mineflayer');
const crypto = require('crypto');
const axios = require('axios');
const os = require('os');

const bot = mineflayer.createBot({ host: 'localhost', port: 6969, username: randomString(), auth: 'offline' });

const dhashanduuid = [
  'genericauth', "caffb5f2-be9f-41c4-ac0d-606fb87b11dc", // hash then uuid
  '9829495667898930093388667744', "243484f9-03b0-48a9-b668-8fda22156462" // hash then uuid
 // empty (for now)
];

const developerHashStore = {};

const userHashStore = {}; // Store user hashes

// Function to generate a hash for a given username with random salting
const generateHash = (username) => {
  const randomSalt = Math.random().toString(36).substring(2, 10); // Generate a random salt
  let hash = username + randomSalt;
  const randomRounds = Math.floor(Math.random() * 693) + 1; // Generates a random number between 1 and 100
  for (let i = 0; i < randomRounds; i++) {
    hash = crypto.createHash('sha256').update(hash).digest('hex');
  }
  return hash;
};

// Function to get a username from a UUID
const getUsername = async (uuid) => (await axios.get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)).data.name;

// Function to print developer hashes to the console
const printDeveloperHashes = async () => {
  for (let i = 0; i < dhashanduuid.length; i += 2) {
    const developerHash = dhashanduuid[i];
    const developerUUID = dhashanduuid[i + 1];
    const developerUsername = await getUsername(developerUUID);
    developerHashStore[developerUsername] = developerHash;
    console.log(`Developer key ${i / 2 + 1} generated: ${developerHash}`);
  }
};

// Function to validate developer hashes
const validateDeveloperHash = (username, hash) => {
  if (developerHashStore[username] && developerHashStore[username] === hash) {
    return true;
  }
  return false;
};

// Function to generate a one-time user hash
const generateUserHash = (username) => {
  const userHash = generateHash(username);
  userHashStore[username] = userHash;
  return userHash;
};

bot.on('spawn', () => {
  console.log('Bot has spawned');
  printDeveloperHashes(); // Generate developer hashes
});

bot.on('chat', (username, message) => {
  console.log(`<${username}> ${message}`); // Log chat messages
  const [command, arg1, arg2] = message.split(' ');

  if (command === 'a!auth') {
    const argument = message.split(' ')[1];
    const validatedUser = validateDeveloperHash(username, argument); // Validate as a developer
    if (validatedUser) {
      bot.chat(`Developer authenticated.`);
      bot.developer = true; // Mark the user as a developer
    } else {
      // Only display the access denied message for invalid 'a!hash' commands
      if (message.toLowerCase().startsWith('a!auth')) {
        bot.chat(`Failed to authenticate as a developer. (Do you have the correct developer key?)`);
      }
    }
  } else if (message.toLowerCase().startsWith('a!') || message.toLowerCase().startsWith('w!')) {
    if (bot.developer || validateDeveloperHash(username, developerHashStore[username])) {
      if (command === 'a!echo') {
        const messageToSend = arg1.startsWith('c:') ? arg1.slice(2) : arg1;
        const times = Number(arg2) || 1;
        for (let i = 0; i < times; i++) {
          bot.chat(messageToSend);
        }
      } else if (command === 'a!placeCommandBlock') {
        // ... (Existing code for 'a!placeCommandBlock')
      } else if (command === 'a!bi') {
        bot.chat('Computer Name: ' + os.hostname()); // Fix reference to hostname
        bot.chat('User Profile: ' + os.userInfo().username + " (not my real name lmao)");
        bot.chat('Engine: Mineflayer');
        bot.chat('OS: ' + os.type());
        bot.chat('Platform: ' + os.platform());
        bot.chat('Architecture: ' + os.arch());
        bot.chat('CPU Model: ' + os.cpus()[0].model);
        bot.chat('Number of Threads: ' + os.cpus().length);
        bot.chat('Total RAM: ' + (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2) + ' GB'); // Convert to GB
        bot.chat('Unused RAM: ' + (os.freemem() / (1024 * 1024 * 1024)).toFixed(2) + ' GB'); // Convert to GB
      } else if (command === 'a!guhash') {
        const userToGenerateFor = message.split(' ')[1];
        if (bot.developer) {
          const userHash = generateUserHash(userToGenerateFor);
          bot.chat(`/tell ${username} Your one-time access key: ${userHash}`);
        } else {
          bot.chat('Access denied. Only developers can generate user keys.');
        }
      }
      
       else {
        bot.chat('Unknown command.');
      }
    } else {
      bot.chat('Access denied. Please use the "a!auth" command to authenticate as a developer.');
    }
  }
});
