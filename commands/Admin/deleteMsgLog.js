const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const logSchema = require('../../schemas/deletemsglog');

module.exports = {
  data: new SlashCommandBuilder()
  .setName('delete-message-log')
  .setDescription('Delete message log')
  .addSubcommand(command => command.setName('setup').setDescription('Setup the message logging system').addChannelOption(option => option.setName('channel').setDescription('Channel message loggin system').setRequired(true).addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(command => command.setName('disable').setDescription('disable delete message logging system')),
  async execute (interaction) {
    const { options } = interaction;
    const sub = options.getSubcommand();
    var data = await logSchema.findOne({ Guild: interaction.guild.id});

    async function sendMessage(message) {
      const embed = new EmbedBuilder()
      .setColor('Green')
      .setDescription(message);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    switch (sub) {
      case 'setup':
        if (data) {
          await sendMessage(`Sistema ja esta ativo`)
        } else {
          var channel = options.getChannel('channel');
          await logSchema.create({
            Guild: interaction.guild.id,
            Channel: channel.id
          });

          await sendMessage('Setup completo')
        }
      break;
      case 'disable':
        if (!data) {
          await sendMessage('Setup nao esta ativo!')
        } else {
          await logSchema.deleteOne({ Guild: interaction.guild.id })
          await sendMessage('Sistema foi desabilitado!')
        }
    }

  }
}