const { Client, Events, PermissionsBitField, Partials, GatewayIntentBits, EmbedBuilder, AuditLogEvent } = require('discord.js');

const logSchema = require('./schemas/deletemsglog.js')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildScheduledEvents,
    ],
    partials: [
        Partials.User,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.Reaction,
        Partials.GuildScheduledEvent,
        Partials.ThreadMember,
    ],
});

client.config = require('./config.json');
client.cooldowns = new Map();
client.cache = new Map();

require('./utils/ComponentLoader.js')(client);
require('./utils/EventLoader.js')(client);
require('./utils/RegisterCommands.js')(client);

console.log(`Logging in...`);
client.login(client.config.TOKEN)
client.on('ready', function () {
    console.log(`Logged in as ${client.user.tag}!`);
});


async function InteractionHandler(interaction, type) {

    const component = client[type].get( interaction.customId ?? interaction.commandName );
    if (!component) {
        // console.error(`${type} not found: ${interaction.customId ?? interaction.commandName}`);
        return;
    }

    try {
        //command properties
        if (component.admin) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ content: `⚠️ Only administrators can use this command!`, ephemeral: true });
        }

        if (component.owner) {
            if (interaction.user.id !== 'YOURUSERID') return await interaction.reply({ content: `⚠️ Only bot owners can use this command!`, ephemeral: true });
        }

        //the mod command property requires additional setup, watch the video here to set it up: https://youtu.be/2Tqy6Cp_10I?si=bharHI_Vw7qjaG2Q

        /*
            COMMAND PROPERTIES:

            module.exports = {
                admin: true,
                data: new SlashCommandBuilder()
                .setName('test')
                .setDescription('test'),
                async execute(interaction) { 
                
                }
                }
            }

            You can use command properties in the module.exports statement by adding a valid property to : true,

            VALID PROPERTIES:

            admin : true/false
            owner : true/false


            You can add more command properties by following the prompt below and pasting it above in location with all the other statements:
            
            if (component.propertyname) {
                if (logic statement logic) return await interaction.reply({ content: `⚠️ response to flag`, ephemeral: true });
            }
        */

        await component.execute(interaction, client);
    } catch (error) {
        console.error("stack" in error ? error.stack : error);
        await interaction.deferReply({ ephemeral: true }).catch( () => {} );
        await interaction.editReply({
            content: `There was an error while executing this command!\n\`\`\`${error}\`\`\``,
            embeds: [],
            components: [],
            files: []
        }).catch( () => {} );
    }
}

client.on('interactionCreate', async function(interaction) {
    if (!interaction.isCommand()) return;
    await InteractionHandler(interaction, 'commands');
});


client.on('interactionCreate', async function(interaction) {
    if (!interaction.isButton()) return;
    await InteractionHandler(interaction, 'buttons');
});


client.on('interactionCreate', async function(interaction) {
    if (!interaction.isStringSelectMenu()) return;
    await InteractionHandler(interaction, 'dropdowns');
});


client.on('interactionCreate', async function(interaction) {
    if (!interaction.isModalSubmit()) return;
    await InteractionHandler(interaction, 'modals');
});

client.on('roleCreate', async (role, executorId) => {

    const executor = await client.users.fetch(executorId);
    console.log(`${role.id}, ${executor}`)
})

client.on('messageDelete', async (message) => {
    try {
        // Verifica se a mensagem é de um servidor e se há um canal definido
        if (!message.guild) return;

        // Busca o documento no MongoDB
        const data = await logSchema.findOne({ Guild: message.guild.id });
        if (!data) return;

        // Obtém o canal
        const sendChannel = await message.guild.channels.fetch(data.Channel);
        
        // Verifica se o canal é um canal de texto
        if (!sendChannel.isTextBased()) {
            console.error('O canal não é um canal de texto.');
            return;
        }

        // Prepara o conteúdo da mensagem
        const attachments = message.attachments.map(attachment => attachment.url);
        const member = message.author;
        const deleteTime = `<t:${Math.floor(Date.now() / 1000)}:R>`;

        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle(`⚠ Mensagem deletada`)
            .setDescription(`A Mensagem foi deletada há ${deleteTime}`)
            .addFields({ name: "Conteudo da mensagem:", value: `> ${message.content || "Mensagem sem conteudo"}` })
            .addFields({ name: "Autor da mensagem:", value: `> \`${member.username} (${member.id})\`` })
            .addFields({ name: "Canal em que mensagem foi enviada:", value: `> \`${message.channel} (${message.channel.id})\``})
            .setFooter({ text: `[SISTEMA DE LOG] Mensagem deletada`})
            .setTimestamp();

            if(attachments.length > 0) {
                embed.addFields({ name: "Attachs da mensagem", value: attachments.join(' , ')});
            }

        // Envia o embed para o canal
        await sendChannel.send({ embeds: [embed] });

        console.log(`Mensagem deletada do servidor ${message.guild.id}`);
    } catch (error) {
        console.error('Erro ao processar a mensagem deletada:', error);
    }
});

client.on(Events.ChannelCreate, async channel => {
    channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelCreate,
    })
    .then(async audit => {
        const { executor } = audit.entries.first()

        const name = channel.name;
        const id = channel.id;
        let type = channel.type;

        if (type == 0) type = 'Text'
        if (type == 2) type = 'Voice'
        if (type == 0) type = 'Stage'
        if (type == 0) type = 'Form'
        if (type == 0) type = 'Announcement'
        if (type == 0) type = 'Category'

        const channelId= '1272787447557652543';
        const mChannel = await channel.guild.channels.cache.get(channelId)

        const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Channel Created")
        .addFields({ name: 'Channel Name', value: `${name}`, inline: false})
        .addFields({ name: 'Channel Type', value: `${type}`, inline: false})
        .addFields({ name: 'Channel ID', value: `${id}`, inline: false})
        .addFields({ name: 'Created By', value: `${executor.tag} `, inline: false})
        .setTimestamp()
        .setFooter({ text: "Mod Log System Warning"})

        mChannel.send({ embeds: [embed]})
    })
})

client.on(Events.MessageUpdate, async (message, newMessage) => {
    message.guild.fetchAuditLogs({
        type: AuditLogEvent.MessageUpdate,
    })
    .then( async audit => {
        const { executor } = audit.entries.first()

        const msg = message.content;

        if(!msg) return;



        console.log(`${msg} ${newMessage} ${executor.tag} `)
    })
})

client.on(Events.ChannelDelete, async channel => {
    channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
    })
    .then(async audit => {
        const { executor } = audit.entries.first()

        const name = channel.name;
        const id = channel.id;
        let type = channel.type;

        if (type == 0) type = 'Text'
        if (type == 2) type = 'Voice'
        if (type == 0) type = 'Stage'
        if (type == 0) type = 'Form'
        if (type == 0) type = 'Announcement'
        if (type == 0) type = 'Category'

        const channelId= '1272787447557652543';
        const mChannel = await channel.guild.channels.cache.get(channelId)

        const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Channel Deleted")
        .addFields({ name: 'Channel Name', value: `${name}`, inline: false})
        .addFields({ name: 'Channel Type', value: `${type}`, inline: false})
        .addFields({ name: 'Channel ID', value: `${id}`, inline: false})
        .addFields({ name: 'Deleted By', value: `${executor.tag} `, inline: false})
        .setTimestamp()
        .setFooter({ text: "Mod Log System Warning"})

        mChannel.send({ embeds: [embed]})
    })
})

client.on(Events.MessageDelete, async (message) => {
    message.guild.fetchAuditLogs({
        type: AuditLogEvent.MessageDelete,
    })
    .then( async audit => {
        const { executor } = audit.entries.first()

        const msg = message.content;
        const member = message.author

        if(!msg) return

        console.log(`${executor.tag} ${member.tag} ${msg} ${message.channel}`)
    })
})

