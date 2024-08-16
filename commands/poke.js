const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('poke')
		.setDescription('Poke the bot!'),
	async execute(interaction, client) {
		const button = new ButtonBuilder()
		.setCustomId('poke')
		.setStyle(ButtonStyle.Primary)
		.setLabel('Poke me!');

		const row = new ActionRowBuilder()
		.addComponents(button);

		await interaction.reply({
			content: 'Poke me!',
			components: [row],
		});

	}
}
