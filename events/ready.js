const { ActivityType, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

var config = require('../config.json');
const mongoURL = config.MONGOURL;

module.exports = {
    name: 'ready', 
    once: true,
    async execute(client) { 

        client.user.setActivity({
            name: '🌍 Turning on using dev toolkit',
            type: ActivityType.Custom,
         //   url: 'https://www.twitch.tv/discord'
        });

        if (!mongoURL) return;

        await mongoose.connect(mongoURL || '', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        if (mongoose.connect) {
            console.log('I have connected to the database!');
        } else {
            console.log("I cannot connect to the database right now...");
        }

    },
};

