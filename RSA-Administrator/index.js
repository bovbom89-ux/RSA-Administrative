const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID =
  process.env.DISCORD_CLIENT_ID ||
  process.env.DISCORD_APPLICATION_ID;
const GUILD_ID =
  process.env.DISCORD_GUILD_ID ||
  process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("BOT CONFIGURATION ERROR");
  console.error("Check these three environment variables:");
  console.error("DISCORD_TOKEN");
  console.error("DISCORD_CLIENT_ID (Application ID)");
  console.error("DISCORD_GUILD_ID or GUILD_ID");
  process.exit(1);
}

const BRAND_COLOUR = 0x1F4E79;
const FOOTER_TEXT = "London, Uxbridge";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const dataDirectory = path.join(__dirname, "..", "data");
const dataFile = path.join(dataDirectory, "records.json");

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

function loadData() {
  try {
    if (!fs.existsSync(dataFile)) {
      return { warnings: {}, shifts: {}, reports: [] };
    }

    const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8"));

    return {
      warnings: parsed.warnings || {},
      shifts: parsed.shifts || {},
      reports: parsed.reports || []
    };
  } catch (error) {
    console.error("Could not read data/records.json:", error.message);
    return { warnings: {}, shifts: {}, reports: [] };
  }
}

let database = loadData();

function saveData() {
  fs.writeFileSync(dataFile, JSON.stringify(database, null, 2));
}

function makeEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(BRAND_COLOUR)
    .setTitle(title)
    .setDescription(description || "No details provided.")
    .setFooter({ text: FOOTER_TEXT })
    .setTimestamp();
}

function isModerator(interaction) {
  return interaction.memberPermissions?.has(
    PermissionFlagsBits.ModerateMembers
  ) || interaction.memberPermissions?.has(
    PermissionFlagsBits.ManageMessages
  ) || interaction.memberPermissions?.has(
    PermissionFlagsBits.KickMembers
  ) || interaction.memberPermissions?.has(
    PermissionFlagsBits.BanMembers
  );
}

async function replyEmbed(interaction, title, description, ephemeral = false) {
  const embed = makeEmbed(title, description);

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({ embeds: [embed] });
  }

  return interaction.reply({
    embeds: [embed],
    ephemeral
  });
}

const commands = [
  new SlashCommandBuilder()
    .setName("information")
    .setDescription("View information about London, Uxbridge"),

  new SlashCommandBuilder()
    .setName("rules")
    .setDescription("View the server rules"),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("View available bot commands"),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot response time"),

  new SlashCommandBuilder()
    .setName("host-shift")
    .setDescription("Record a staff shift")
    .addStringOption(o =>
      o.setName("details").setDescription("Shift details").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("shift-stats")
    .setDescription("View recorded shift statistics")
    .addUserOption(o =>
      o.setName("user").setDescription("Staff member to check")
    ),

  new SlashCommandBuilder()
    .setName("military-operation")
    .setDescription("Announce a military operation")
    .addStringOption(o =>
      o.setName("details").setDescription("Operation details").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("training-session")
    .setDescription("Announce a training session")
    .addStringOption(o =>
      o.setName("details").setDescription("Training details").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption(o =>
      o.setName("user").setDescription("Member to warn").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason for the warning").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption(o =>
      o.setName("user").setDescription("Member to timeout").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("minutes").setDescription("Timeout length in minutes").setRequired(true).setMinValue(1).setMaxValue(40320)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason for timeout").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(o =>
      o.setName("user").setDescription("Member to kick").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason for kick").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(o =>
      o.setName("user").setDescription("Member to ban").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason for ban").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete recent messages")
    .addIntegerOption(o =>
      o.setName("amount").setDescription("Number of messages to delete").setRequired(true).setMinValue(1).setMaxValue(100)
    ),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("View information about a member")
    .addUserOption(o =>
      o.setName("user").setDescription("Member to inspect")
    ),

  new SlashCommandBuilder()
    .setName("modlogs")
    .setDescription("View warnings recorded by this bot")
    .addUserOption(o =>
      o.setName("user").setDescription("Member to check").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("staff-report")
    .setDescription("Submit a staff report")
    .addStringOption(o =>
      o.setName("details").setDescription("Report details").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("report")
    .setDescription("Report a member")
    .addUserOption(o =>
      o.setName("user").setDescription("Member being reported").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason for report").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Submit a suggestion")
    .addStringOption(o =>
      o.setName("suggestion").setDescription("Your suggestion").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("feedback")
    .setDescription("Submit feedback")
    .addStringOption(o =>
      o.setName("message").setDescription("Your feedback").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Post an announcement")
    .addStringOption(o =>
      o.setName("message").setDescription("Announcement text").setRequired(true)
    )
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Channel to post in")
        .addChannelTypes(ChannelType.GuildText)
    )
];

const commandNames = commands.map(command => command.name);

async function sendToNamedChannel(guild, channelName, embed) {
  const channel = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.name === channelName
  );

  if (!channel) {
    return false;
  }

  await channel.send({ embeds: [embed] });
  return true;
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Registering ${commands.length} guild slash commands...`);

  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map(command => command.toJSON()) }
    );

    console.log(`Successfully registered ${commands.length} commands.`);
  } catch (error) {
    console.error("SLASH COMMAND REGISTRATION FAILED:");
    console.error(error);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guild, user } = interaction;

  try {
    if (!guild) {
      return replyEmbed(interaction, "Server Only", "Use this command inside the server.", true);
    }

    if (commandName === "ping") {
      return replyEmbed(
        interaction,
        "Bot Status",
        `WebSocket latency: ${client.ws.ping} ms`
      );
    }

    if (commandName === "information") {
      return replyEmbed(
        interaction,
        "London, Uxbridge",
        "Welcome to London, Uxbridge. Please follow the server rules and respect other members."
      );
    }

    if (commandName === "rules") {
      return replyEmbed(
        interaction,
        "Server Rules",
        "1. Treat everyone respectfully.\n2. Follow staff instructions.\n3. Do not spam or disrupt the server.\n4. Do not misuse channels or commands.\n5. Follow Discord's Terms of Service."
      );
    }

    if (commandName === "help") {
      return replyEmbed(
        interaction,
        "Command Directory",
        commandNames.map(name => `/${name}`).join("  •  ")
      );
    }

    if (commandName === "host-shift") {
      const details = interaction.options.getString("details", true);
      const entry = {
        userId: user.id,
        details,
        timestamp: new Date().toISOString()
      };

      database.shifts[user.id] ||= [];
      database.shifts[user.id].push(entry);
      saveData();

      const sent = await sendToNamedChannel(
        guild,
        "staff-shifts",
        makeEmbed("Staff Shift Recorded", `**Host:** ${user}\n**Details:** ${details}`)
      );

      return replyEmbed(
        interaction,
        "Shift Recorded",
        sent ? "Your shift has been recorded and posted." : "Your shift has been recorded. The #staff-shifts channel was not found."
      );
    }

    if (commandName === "shift-stats") {
      const target = interaction.options.getUser("user") || user;
      const shifts = database.shifts[target.id] || [];

      return replyEmbed(
        interaction,
        "Shift Statistics",
        `**Staff member:** ${target}\n**Recorded shifts:** ${shifts.length}`
      );
    }

    if (commandName === "military-operation" || commandName === "training-session") {
      if (!isModerator(interaction)) {
        return replyEmbed(interaction, "Permission Denied", "You need a staff moderation permission to use this command.", true);
      }

      const details = interaction.options.getString("details", true);
      const title = commandName === "military-operation" ? "Military Operation" : "Training Session";

      await interaction.channel.send({
        embeds: [makeEmbed(title, `**Host:** ${user}\n\n${details}`)]
      });

      return replyEmbed(interaction, "Announcement Posted", `${title} posted successfully.`);
    }

    if (commandName === "warn") {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
        return replyEmbed(interaction, "Permission Denied", "You need the Moderate Members permission.", true);
      }

      const target = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);

      database.warnings[target.id] ||= [];
      database.warnings[target.id].push({
        moderatorId: user.id,
        reason,
        timestamp: new Date().toISOString()
      });
      saveData();

      const logged = await sendToNamedChannel(
        guild,
        "mod-logs",
        makeEmbed("Member Warned", `**Member:** ${target}\n**Moderator:** ${user}\n**Reason:** ${reason}`)
      );

      return replyEmbed(
        interaction,
        "Warning Recorded",
        `Warning recorded for ${target}.${logged ? "" : "\nNote: #mod-logs was not found."}`
      );
    }

    if (commandName === "timeout") {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
        return replyEmbed(interaction, "Permission Denied", "You need the Moderate Members permission.", true);
      }

      const target = interaction.options.getUser("user", true);
      const minutes = interaction.options.getInteger("minutes", true);
      const reason = interaction.options.getString("reason", true);
      const member = await guild.members.fetch(target.id);

      if (!member.moderatable) {
        return replyEmbed(interaction, "Action Failed", "I cannot timeout that member. Check my role position and permissions.", true);
      }

      await member.timeout(minutes * 60 * 1000, reason);

      await sendToNamedChannel(
        guild,
        "mod-logs",
        makeEmbed("Member Timed Out", `**Member:** ${target}\n**Moderator:** ${user}\n**Duration:** ${minutes} minutes\n**Reason:** ${reason}`)
      );

      return replyEmbed(interaction, "Timeout Applied", `${target} was timed out for ${minutes} minute(s).`);
    }

    if (commandName === "kick" || commandName === "ban") {
      const permission = commandName === "kick"
        ? PermissionFlagsBits.KickMembers
        : PermissionFlagsBits.BanMembers;

      if (!interaction.memberPermissions.has(permission)) {
        return replyEmbed(interaction, "Permission Denied", `You need the ${commandName === "kick" ? "Kick Members" : "Ban Members"} permission.`, true);
      }

      const target = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      const member = await guild.members.fetch(target.id).catch(() => null);

      if (!member) {
        if (commandName === "kick") {
          return replyEmbed(interaction, "Action Failed", "That member is not in this server.", true);
        }
      } else {
        if (member.id === user.id) {
          return replyEmbed(interaction, "Action Failed", "You cannot moderate yourself.", true);
        }

        if (commandName === "kick") {
          if (!member.kickable) {
            return replyEmbed(interaction, "Action Failed", "I cannot kick that member. Check role hierarchy.", true);
          }
          await member.kick(reason);
        } else {
          if (!member.bannable) {
            return replyEmbed(interaction, "Action Failed", "I cannot ban that member. Check role hierarchy.", true);
          }
          await member.ban({ reason });
        }
      }

      await sendToNamedChannel(
        guild,
        "mod-logs",
        makeEmbed(commandName === "kick" ? "Member Kicked" : "Member Banned", `**Member:** ${target}\n**Moderator:** ${user}\n**Reason:** ${reason}`)
      );

      return replyEmbed(
        interaction,
        commandName === "kick" ? "Member Kicked" : "Member Banned",
        `${target} was ${commandName === "kick" ? "kicked" : "banned"}.`
      );
    }

    if (commandName === "purge") {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
        return replyEmbed(interaction, "Permission Denied", "You need the Manage Messages permission.", true);
      }

      const amount = interaction.options.getInteger("amount", true);
      const channel = interaction.channel;

      if (!channel || !channel.isTextBased() || !("bulkDelete" in channel)) {
        return replyEmbed(interaction, "Action Failed", "This channel does not support bulk deletion.", true);
      }

      const deleted = await channel.bulkDelete(amount, true);

      return replyEmbed(
        interaction,
        "Messages Deleted",
        `Deleted ${deleted.size} message(s). Messages older than 14 days cannot be bulk deleted.`
      );
    }

    if (commandName === "userinfo") {
      const target = interaction.options.getUser("user") || user;
      const member = await guild.members.fetch(target.id).catch(() => null);

      return replyEmbed(
        interaction,
        "User Information",
        `**Username:** ${target.tag}\n**User ID:** ${target.id}\n**Account created:** <t:${Math.floor(target.createdTimestamp / 1000)}:F>\n**Joined server:** ${member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : "Not available"}`
      );
    }

    if (commandName === "modlogs") {
      if (!isModerator(interaction)) {
        return replyEmbed(interaction, "Permission Denied", "You need a staff moderation permission.", true);
      }

      const target = interaction.options.getUser("user", true);
      const warnings = database.warnings[target.id] || [];

      const description = warnings.length
        ? warnings.slice(-10).map((warning, index) =>
          `**${index + 1}.** ${warning.reason}\nModerator: <@${warning.moderatorId}> • <t:${Math.floor(new Date(warning.timestamp).getTime() / 1000)}:R>`
        ).join("\n\n")
        : "No warnings recorded by this bot.";

      return replyEmbed(interaction, `Moderation Records: ${target.tag}`, description, true);
    }

    if (commandName === "staff-report" || commandName === "report") {
      const details = commandName === "staff-report"
        ? interaction.options.getString("details", true)
        : `Reported member: ${interaction.options.getUser("user", true)}\nReason: ${interaction.options.getString("reason", true)}`;

      const entry = {
        type: commandName,
        submittedBy: user.id,
        details,
        timestamp: new Date().toISOString()
      };

      database.reports.push(entry);
      saveData();

      const sent = await sendToNamedChannel(
        guild,
        "reports",
        makeEmbed(commandName === "staff-report" ? "Staff Report" : "Member Report", `**Submitted by:** ${user}\n\n${details}`)
      );

      return replyEmbed(
        interaction,
        "Report Submitted",
        sent ? "Your report has been recorded and sent to the reports channel." : "Your report has been recorded, but the #reports channel was not found."
      , true);
    }

    if (commandName === "suggest" || commandName === "feedback") {
      const details = commandName === "suggest"
        ? interaction.options.getString("suggestion", true)
        : interaction.options.getString("message", true);

      const channelName = commandName === "suggest" ? "suggestions" : "feedback";
      const sent = await sendToNamedChannel(
        guild,
        channelName,
        makeEmbed(commandName === "suggest" ? "New Suggestion" : "New Feedback", `**Submitted by:** ${user}\n\n${details}`)
      );

      return replyEmbed(
        interaction,
        commandName === "suggest" ? "Suggestion Submitted" : "Feedback Submitted",
        sent ? `Your submission was sent to #${channelName}.` : `Your submission was received, but #${channelName} was not found.`
      , true);
    }

    if (commandName === "announce") {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        return replyEmbed(interaction, "Permission Denied", "You need the Manage Server permission.", true);
      }

      const message = interaction.options.getString("message", true);
      const channel = interaction.options.getChannel("channel") || interaction.channel;

      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        return replyEmbed(interaction, "Action Failed", "Choose a valid text channel.", true);
      }

      await channel.send({ embeds: [makeEmbed("Announcement", message)] });

      return replyEmbed(interaction, "Announcement Posted", `Announcement posted in ${channel}.`);
    }

    return replyEmbed(interaction, "Unknown Command", "That command is not supported.");
  } catch (error) {
    console.error(`Command /${commandName} failed:`, error);

    const message =
      error.code === 50013
        ? "I do not have the required permissions. Check my server permissions and role position."
        : "The command failed. Check the hosting console for the detailed error.";

    try {
      await replyEmbed(interaction, "Command Error", message, true);
    } catch {
      // The interaction may already have expired.
    }
  }
});

client.on("error", error => {
  console.error("Discord client error:", error);
});

process.on("unhandledRejection", error => {
  console.error("Unhandled promise rejection:", error);
});

client.login(TOKEN).catch(error => {
  console.error("BOT LOGIN FAILED:");
  console.error(error);
  process.exit(1);
});
