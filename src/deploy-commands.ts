import { REST, Routes } from 'discord.js';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    // Grab all the command files from the commands directory you created earlier
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js')); // Read .js files after compilation
    // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        // Use dynamic import for ES modules
        const commandModule = await import(filePath);
        if (commandModule.data && typeof commandModule.execute === 'function') {
            commands.push(commandModule.data.toJSON());
            console.log(`[INFO] Loaded command from ${filePath}`);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.BOT_TOKEN!);

// and deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        if (!process.env.CLIENT_ID) {
            throw new Error('Missing CLIENT_ID in .env file');
        }
         if (!process.env.GUILD_ID) {
            console.warn('Missing GUILD_ID in .env file. Registering commands globally. This might take up to an hour.');
            // Deploy globally
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
             console.log(`Successfully reloaded ${Array.isArray(data) ? data.length : 'unknown'} application (/) commands globally.`);
        } else {
            // Deploy to a specific guild (faster for testing)
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log(`Successfully reloaded ${Array.isArray(data) ? data.length : 'unknown'} application (/) commands for guild ${process.env.GUILD_ID}.`);
        }


    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
