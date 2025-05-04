import { Client, Events, GatewayIntentBits, Collection, Interaction } from 'discord.js';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Extend Client type to include commands collection
interface ClientWithCommands extends Client {
    commands: Collection<string, any>;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] }) as ClientWithCommands;

client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

async function loadCommands() {
    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        // Filter for compiled .js files
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            // Convert file path to file URL for dynamic import
            const fileUrl = `file://${filePath}`;
            try {
                const command = await import(fileUrl);
                // Set a new item in the Collection with the key as the command name and the value as the exported module
                if (command.data && command.execute) {
                    client.commands.set(command.data.name, command);
                    console.log(`[INFO] Loaded command ${command.data.name} from ${file}`);
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            } catch (error) {
                 console.error(`[ERROR] Failed to load command at ${filePath}:`, error);
            }
        }
    }
}


client.once(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = (interaction.client as ClientWithCommands).commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        await interaction.reply({ content: 'Error: Command not found.', ephemeral: true });
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

// Load commands before logging in
loadCommands().then(() => {
    client.login(process.env.BOT_TOKEN);
});