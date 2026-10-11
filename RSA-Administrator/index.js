
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("node:fs");
const path = require("node:path");

// ======================================================
// CONFIGURATION
// Enter your real Discord IDs and bot token below.
// ======================================================

const CONFIG = {
  token: "PASTE_YOUR_BOT_TOKEN_HERE",
  applicationId: "PASTE_YOUR_APPLICATION_ID_HERE",
  serverId: "PASTE_YOUR_SERVER_ID_HERE",

  roles: {
    seniorModeration: "PASTE_SENIOR_MODERATION_ROLE_ID",
    moderation: "PASTE_MODERATION_ROLE_ID",
    moderatorInTraining: "PASTE_MODERATOR_IN_TRAINING_ROLE_ID",
    shiftHost: "PASTE_SHIFT_HOST_ROLE_ID",
    militaryHost: "PASTE_MILITARY_HOST_ROLE_ID"
  },

  channels: {
    shifts: "staff-shifts",
    modLogs: "mod-logs",
    reports: "reports",
    suggestions: "suggestions",
    feedback: "feedback",
    announcements: "announcements"
  },

  colour: 0x1F4E79,
  footer: "London, Uxbridge"
};

// ======================================================
// CLIENT AND DATA STORAGE
// ======================================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const dataDirectory = path.join(__dirname, "data");

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const files = {
  warnings: path.join(dataDirectory, "warnings.json"),
  modlogs: path.join(dataDirectory, "modlogs.json"),
  reports: path.join(dataDirectory, "reports.json"),
  shifts: path.join(dataDirectory, "shifts.json")
};

function readData(file) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "{}");
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Could not read ${path.basename(file)}:`, error.message);
    return {};
  }
}

function writeData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function makeEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(CONFIG.colour)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: CONFIG.footer });
}

function isPlaceholder(value) {
  return !value || value.startsWith("PASTE_");
}

function hasRole(member, roleId) {
  return Boolean(
    member?.roles?.cache?.has(roleId) &&
    !isPlaceholder(roleId)
  );
}

function isSenior(member) {
  return hasRole(member, CONFIG.roles.seniorModeration);
}

function isStaff(member) {
  return (
    isSenior(member) ||
    hasRole(member, CONFIG.roles.moderation) ||
    hasRole(member, CONFIG.roles.moderatorInTraining)
  );
}

function isModerator(member) {
  return (
    isSenior(member) ||
    hasRole(member, CONFIG.roles.moderation)
  );
}

function hasPermission(member, permission) {
  return Boolean(member?.permissions?.has(permission));
}

function canModerate(member, permission) {
  return isModerator(member) && hasPermission(member, permission);
}

async function replyEmbed(interaction, title, description, ephemeral = true) {
  const payload = {
    embeds: [makeEmbed(title, description)],
    ephemeral
  };

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({
      embeds: payload.embeds
    });
  }

  return interaction.reply(payload);
}

function getTextChannel(guild, channelName) {
  return guild.channels.cache.find(
    channel =>
      channel.name === channelName &&
      channel.isTextBased() &&
      typeof channel.send === "function"
  );
}

async function sendToChannel(guild, channelName, embed) {
  const channel = getTextChannel(guild, channelName);

  if (!channel) {
    console.warn(`Channel #${channelName} was not found in ${guild.name}.`);
    return false;
  }

  await channel.send({ embeds: [embed] });
  return true;
}

async function logModeration(guild, details) {
  const logs = readData(files.modlogs);

  if (!Array.isArray(logs[guild.id])) {
    logs[guild.id] = [];
  }

  logs[guild.id].push({
    ...details,
    timestamp: new Date().toISOString()
  });

  writeData(files.modlogs, logs);

  const description = [
    `**Action:** ${details.action}`,
    `**Target:** ${details.target}`,
    `**Moderator:** ${details.moderator}`,
    `**Reason:** ${details.reason || "No reason supplied"}`
  ].join("\n");

  await sendToChannel(
    guild,
    CONFIG.channels.modLogs,
    makeEmbed("Moderation Log", description)
  );
}

function getOption(interaction, name) {
  return interaction.options.get(name);
}

// ======================================================
// SLASH COMMANDS
// ======================================================

const commands = [
  new SlashCommandBuilder()
    .setName("information")
    .setDescription("View community information"),

  new SlashCommandBuilder()
    .setName("rules")
    .setDescription("View the community rules"),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("View the bot commands"),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot's response"),

  new SlashCommandBuilder()
    .setName("host-shift")
    .setDescription("Announce a staff shift")
    .addStringOption(o =>
      o.setName("details").setDescription("Shift details").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("shift-stats")
    .setDescription("View recorded staff shift statistics")
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
      o.setName("reason").setDescription("Reason for warning").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption(o =>
      o.setName("user").setDescription("Member to timeout").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("minutes")
        .setDescription("Duration in minutes")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(o =>
      o.setName("user").setDescription("Member to kick").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(o =>
      o.setName("user").setDescription("Member to ban").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete recent messages")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("Number of messages to delete")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("View information about a member")
    .addUserOption(o =>
      o.setName("user").setDescription("Member to inspect")
    ),

  new SlashCommandBuilder()
    .setName("modlogs")
    .setDescription("View recent moderation logs")
    .addUserOption(o =>
      o.setName("user").setDescription("Filter by member")
    ),

  new SlashCommandBuilder()
    .setName("staff-report")
    .setDescription("Submit a confidential staff report")
    .addUserOption(o =>
      o.setName("user").setDescription("Staff member being reported").setRequired(true)
    )
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
      o.setName("details").setDescription("Report details").setRequired(true)
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
    .setDescription("Publish a community announcement")
    .addStringOption(o =>
      o.setName("message").setDescription("Announcement text").setRequired(true)
    )
].map(command => command.toJSON());

// ======================================================
// REGISTER COMMANDS ON STARTUP
// ======================================================

async function registerCommands() {
  const missing = [];

  if (isPlaceholder(CONFIG.token)) missing.push("bot token");
  if (isPlaceholder(CONFIG.applicationId)) missing.push("Application ID");
  if (isPlaceholder(CONFIG.serverId)) missing.push("server ID");

  if (missing.length) {
    throw new Error(
      `Complete the CONFIG section first. Missing: ${missing.join(", ")}`
    );
  }

  const rest = new REST({ version: "10" }).setToken(CONFIG.token);

  console.log("Registering slash commands...");

  await rest.put(
    Routes.applicationGuildCommands(
      CONFIG.applicationId,
      CONFIG.serverId
    ),
    { body: commands }
  );

  console.log(`Successfully registered ${commands.length} slash commands.`);
}

// ======================================================
// BOT STARTUP
// ======================================================

client.once("ready", () => {
  console.log(`Online as ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} server(s).`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (!interaction.inGuild()) {
      return replyEmbed(
        interaction,
        "Server Only",
        "This command can only be used inside a server."
      );
    }

    const { commandName, guild, member } = interaction;

    // --------------------------------------------------
    // INFORMATIONAL COMMANDS
    // --------------------------------------------------

    if (commandName === "information") {
      return replyEmbed(
        interaction,
        "London, Uxbridge",
        "Welcome to London, Uxbridge.\n\nUse `/rules` to review the community rules and `/help` to view available commands.",
        false
      );
    }

    if (commandName === "rules") {
      return replyEmbed(
        interaction,
        "Community Rules",
        [
          "1. Treat all members respectfully.",
          "2. Follow staff instructions.",
          "3. Do not spam or disrupt activities.",
          "4. Do not abuse permissions or exploit systems.",
          "5. Use the appropriate channels.",
          "6. Report concerns to the moderation team."
        ].join("\n"),
        false
      );
    }

    if (commandName === "help") {
      return replyEmbed(
        interaction,
        "Command Directory",
        [
          "**General**",
          "`/information` `/rules` `/help` `/ping` `/userinfo`",
          "",
          "**Staff Activities**",
          "`/host-shift` `/shift-stats` `/military-operation` `/training-session`",
          "",
          "**Moderation**",
          "`/warn` `/timeout` `/kick` `/ban` `/purge` `/modlogs`",
          "",
          "**Community**",
          "`/staff-report` `/report` `/suggest` `/feedback` `/announce`"
        ].join("\n"),
        false
      );
    }

    if (commandName === "ping") {
      return replyEmbed(
        interaction,
        "Connection Status",
        `WebSocket latency: ${client.ws.ping} ms`
      );
    }

    // --------------------------------------------------
    // STAFF SHIFT COMMANDS
    // --------------------------------------------------

    if (commandName === "host-shift") {
      if (
        !isStaff(member) &&
        !hasRole(member, CONFIG.roles.shiftHost)
      ) {
        return replyEmbed(interaction, "Access Denied", "You are not authorised to host shifts.");
      }

      const details = interaction.options.getString("details", true);
      const shifts = readData(files.shifts);

      if (!Array.isArray(shifts[guild.id])) shifts[guild.id] = [];

      shifts[guild.id].push({
        hostId: interaction.user.id,
        hostTag: interaction.user.tag,
        details,
        timestamp: new Date().toISOString()
      });

      writeData(files.shifts, shifts);

      const posted = await sendToChannel(
        guild,
        CONFIG.channels.shifts,
        makeEmbed(
          "Staff Shift",
          `**Host:** ${interaction.user}\n**Details:**\n${details}`
        )
      );

      return replyEmbed(
        interaction,
        posted ? "Shift Recorded" : "Shift Recorded — Channel Missing",
        posted
          ? "The shift has been recorded and announced."
          : `The shift has been recorded, but #${CONFIG.channels.shifts} was not found.`
      );
    }

    if (commandName === "shift-stats") {
      if (!isStaff(member)) {
        return replyEmbed(interaction, "Access Denied", "This command is for staff.");
      }

      const target = interaction.options.getUser("user") || interaction.user;
      const shifts = readData(files.shifts);
      const records = Array.isArray(shifts[guild.id]) ? shifts[guild.id] : [];
      const count = records.filter(record => record.hostId === target.id).length;

      return replyEmbed(
        interaction,
        "Staff Shift Statistics",
        `**Staff member:** ${target}\n**Recorded shifts:** ${count}`
      );
    }

    if (commandName === "military-operation") {
      if (
        !isStaff(member) &&
        !hasRole(member, CONFIG.roles.militaryHost)
      ) {
        return replyEmbed(interaction, "Access Denied", "You are not authorised to host operations.");
      }

      const details = interaction.options.getString("details", true);

      await interaction.channel.send({
        embeds: [
          makeEmbed(
            "Military Operation",
            `**Host:** ${interaction.user}\n**Details:**\n${details}`
          )
        ]
      });

      return replyEmbed(interaction, "Operation Announced", "The operation announcement has been published.");
    }

    if (commandName === "training-session") {
      if (!isStaff(member)) {
        return replyEmbed(interaction, "Access Denied", "This command is for staff.");
      }

      const details = interaction.options.getString("details", true);

      await interaction.channel.send({
        embeds: [
          makeEmbed(
            "Training Session",
            `**Host:** ${interaction.user}\n**Details:**\n${details}`
          )
        ]
      });

      return replyEmbed(interaction, "Training Announced", "The training announcement has been published.");
    }

    // --------------------------------------------------
    // MODERATION PERMISSION CHECKS
    // --------------------------------------------------

    const moderationPermissions = {
      warn: PermissionFlagsBits.ModerateMembers,
      timeout: PermissionFlagsBits.ModerateMembers,
      kick: PermissionFlagsBits.KickMembers,
      ban: PermissionFlagsBits.BanMembers,
      purge: PermissionFlagsBits.ManageMessages,
      modlogs: PermissionFlagsBits.ViewAuditLog
    };

    if (moderationPermissions[commandName]) {
      if (!canModerate(member, moderationPermissions[commandName])) {
        return replyEmbed(
          interaction,
          "Access Denied",
          "You need an authorised moderation role and the corresponding Discord permission."
        );
      }
    }

    // --------------------------------------------------
    // WARN
    // --------------------------------------------------

    if (commandName === "warn") {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);

      if (user.id === interaction.user.id || user.bot) {
        return replyEmbed(interaction, "Invalid Target", "You cannot warn yourself or a bot.");
      }

      const targetMember = await guild.members.fetch(user.id).catch(() => null);

      if (!targetMember) {
        return replyEmbed(interaction, "Member Not Found", "That member is no longer in this server.");
      }

      if (
        targetMember.roles.highest.position >= member.roles.highest.position &&
        guild.ownerId !== interaction.user.id
      ) {
        return replyEmbed(interaction, "Role Hierarchy", "You cannot warn someone with an equal or higher role.");
      }

      const warnings = readData(files.warnings);

      if (!Array.isArray(warnings[guild.id])) warnings[guild.id] = [];

      warnings[guild.id].push({
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
        timestamp: new Date().toISOString()
      });

      writeData(files.warnings, warnings);

      await logModeration(guild, {
        action: "Warning",
        target: `${user.tag} (${user.id})`,
        moderator: interaction.user.tag,
        reason
      });

      return replyEmbed(interaction, "Warning Recorded", `${user} has been warned.\n**Reason:** ${reason}`);
    }

    // --------------------------------------------------
    // TIMEOUT
    // --------------------------------------------------

    if (commandName === "timeout") {
      const user = interaction.options.getUser("user", true);
      const minutes = interaction.options.getInteger("minutes", true);
      const reason = interaction.options.getString("reason", true);

      if (user.id === interaction.user.id || user.id === guild.ownerId) {
        return replyEmbed(interaction, "Invalid Target", "You cannot timeout yourself or the server owner.");
      }

      const target = await guild.members.fetch(user.id).catch(() => null);

      if (!target) {
        return replyEmbed(interaction, "Member Not Found", "That member is not in this server.");
      }

      if (
        target.roles.highest.position >= member.roles.highest.position &&
        guild.ownerId !== interaction.user.id
      ) {
        return replyEmbed(interaction, "Role Hierarchy", "You cannot timeout someone with an equal or higher role.");
      }

      await target.timeout(minutes * 60 * 1000, reason);

      await logModeration(guild, {
        action: `Timeout (${minutes} minutes)`,
        target: `${user.tag} (${user.id})`,
        moderator: interaction.user.tag,
        reason
      });

      return replyEmbed(interaction, "Member Timed Out", `${user} has been timed out for ${minutes} minute(s).\n**Reason:** ${reason}`);
    }

    // --------------------------------------------------
    // KICK
    // --------------------------------------------------

    if (commandName === "kick") {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);

      if (user.id === interaction.user.id || user.id === guild.ownerId) {
        return replyEmbed(interaction, "Invalid Target", "You cannot kick yourself or the server owner.");
      }

      const target = await guild.members.fetch(user.id).catch(() => null);

      if (!target) {
        return replyEmbed(interaction, "Member Not Found", "That member is not in this server.");
      }

      if (
        target.roles.highest.position >= member.roles.highest.position &&
        guild.ownerId !== interaction.user.id
      ) {
        return replyEmbed(interaction, "Role Hierarchy", "You cannot kick someone with an equal or higher role.");
      }

      await target.kick(reason);

      await logModeration(guild, {
        action: "Kick",
        target: `${user.tag} (${user.id})`,
        moderator: interaction.user.tag,
        reason
      });

      return replyEmbed(interaction, "Member Kicked", `${user.tag} has been kicked.\n**Reason:** ${reason}`);
    }

    // --------------------------------------------------
    // BAN
    // --------------------------------------------------

    if (commandName === "ban") {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);

      if (user.id === interaction.user.id || user.id === guild.ownerId) {
        return replyEmbed(interaction, "Invalid Target", "You cannot ban yourself or the server owner.");
      }

      const target = await guild.members.fetch(user.id).catch(() => null);

      if (
        target &&
        target.roles.highest.position >= member.roles.highest.position &&
        guild.ownerId !== interaction.user.id
      ) {
        return replyEmbed(interaction, "Role Hierarchy", "You cannot ban someone with an equal or higher role.");
      }

      await guild.members.ban(user.id, { reason });

      await logModeration(guild, {
        action: "Ban",
        target: `${user.tag} (${user.id})`,
        moderator: interaction.user.tag,
        reason
      });

      return replyEmbed(interaction, "Member Banned", `${user.tag} has been banned.\n**Reason:** ${reason}`);
    }

    // --------------------------------------------------
    // PURGE
    // --------------------------------------------------

    if (commandName === "purge") {
      if (!interaction.channel?.isTextBased() || !interaction.channel.bulkDelete) {
        return replyEmbed(interaction, "Unsupported Channel", "This command cannot be used here.");
      }

      const amount = interaction.options.getInteger("amount", true);
      const deleted = await interaction.channel.bulkDelete(amount, true);

      await logModeration(guild, {
        action: "Purge",
        target: `${deleted.size} messages in #${interaction.channel.name}`,
        moderator: interaction.user.tag,
        reason: `Requested ${amount} messages`
      });

      return replyEmbed(
        interaction,
        "Messages Deleted",
        `Deleted ${deleted.size} recent message(s). Messages older than 14 days cannot be bulk-deleted.`
      );
    }

    // --------------------------------------------------
    // USER INFO
    // --------------------------------------------------

    if (commandName === "userinfo") {
      const user = interaction.options.getUser("user") || interaction.user;
      const target = await guild.members.fetch(user.id).catch(() => null);

      const description = [
        `**Username:** ${user.tag}`,
        `**User ID:** ${user.id}`,
        `**Account Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
        target
          ? `**Joined Server:** <t:${Math.floor(target.joinedTimestamp / 1000)}:F>`
          : "**Server Membership:** Not currently in this server"
      ].join("\n");

      return replyEmbed(interaction, "User Information", description);
    }

    // --------------------------------------------------
    // MODERATION LOGS
    // --------------------------------------------------

    if (commandName === "modlogs") {
      const user = interaction.options.getUser("user");
      const logs = readData(files.modlogs);
      let records = Array.isArray(logs[guild.id]) ? logs[guild.id] : [];

      if (user) {
        records = records.filter(record =>
          record.target.includes(user.id)
        );
      }

      records = records.slice(-10).reverse();

      const description = records.length
        ? records.map(record =>
            `**${record.action}** — ${record.target}\nModerator: ${record.moderator}\nReason: ${record.reason}\n<t:${Math.floor(new Date(record.timestamp).getTime() / 1000)}:R>`
          ).join("\n\n")
        : "No matching moderation logs were found.";

      return replyEmbed(interaction, "Recent Moderation Logs", description);
    }

    // --------------------------------------------------
    // REPORT STORAGE
    // --------------------------------------------------

    if (
      commandName === "staff-report" ||
      commandName === "report"
    ) {
      const target = interaction.options.getUser("user", true);
      const details = interaction.options.getString("details", true);

      const reports = readData(files.reports);

      if (!Array.isArray(reports[guild.id])) reports[guild.id] = [];

      const report = {
        type: commandName === "staff-report" ? "Staff Report" : "Member Report",
        reporterId: interaction.user.id,
        targetId: target.id,
        details,
        timestamp: new Date().toISOString()
      };

      reports[guild.id].push(report);
      writeData(files.reports, reports);

      const channelName = CONFIG.channels.reports;

      const posted = await sendToChannel(
        guild,
        channelName,
        makeEmbed(
          report.type,
          [
            `**Reporter:** ${interaction.user.tag} (${interaction.user.id})`,
            `**Reported member:** ${target.tag} (${target.id})`,
            `**Details:**\n${details}`
          ].join("\n")
        )
      );

      return replyEmbed(
        interaction,
        posted ? "Report Submitted" : "Report Saved",
        posted
          ? "Your report has been sent to the designated report channel."
          : `Your report has been saved, but #${channelName} could not be found. Please notify an administrator.`
      );
    }

    // --------------------------------------------------
    // SUGGESTIONS
    // --------------------------------------------------

    if (commandName === "suggest") {
      const suggestion = interaction.options.getString("suggestion", true);

      const posted = await sendToChannel(
        guild,
        CONFIG.channels.suggestions,
        makeEmbed(
          "Community Suggestion",
          `**Submitted by:** ${interaction.user}\n\n${suggestion}`
        )
      );

      return replyEmbed(
        interaction,
        posted ? "Suggestion Submitted" : "Suggestion Channel Missing",
        posted
          ? "Your suggestion has been sent for review."
          : `Create a #${CONFIG.channels.suggestions} channel and try again.`
      );
    }

    // --------------------------------------------------
    // FEEDBACK
    // --------------------------------------------------

    if (commandName === "feedback") {
      const message = interaction.options.getString("message", true);

      const posted = await sendToChannel(
        guild,
        CONFIG.channels.feedback,
        makeEmbed(
          "Community Feedback",
          `**Submitted by:** ${interaction.user}\n\n${message}`
        )
      );

      return replyEmbed(
        interaction,
        posted ? "Feedback Submitted" : "Feedback Channel Missing",
        posted
          ? "Thank you. Your feedback has been submitted."
          : `Create a #${CONFIG.channels.feedback} channel and try again.`
      );
    }

    // --------------------------------------------------
    // ANNOUNCEMENTS
    // --------------------------------------------------

    if (commandName === "announce") {
      if (!isSenior(member)) {
        return replyEmbed(
          interaction,
          "Access Denied",
          "Only members with the configured Senior Moderation role can use this command."
        );
      }

      const message = interaction.options.getString("message", true);

      const posted = await sendToChannel(
        guild,
        CONFIG.channels.announcements,
        makeEmbed("Community Announcement", message)
      );

      return replyEmbed(
        interaction,
        posted ? "Announcement Published" : "Announcement Channel Missing",
        posted
          ? "Your announcement has been published."
          : `Create a #${CONFIG.channels.announcements} channel and try again.`
      );
    }
  } catch (error) {
    console.error(
      `Error in /${interaction.commandName}:`,
      error
    );

    const description =
      "The command failed. Check the bot logs and make sure the bot has the required permissions.";

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          embeds: [makeEmbed("Command Error", description)],
          ephemeral: true
        });
      } else {
        await replyEmbed(interaction, "Command Error", description);
      }
    } catch (replyError) {
      console.error("Could not send error response:", replyError.message);
    }
  }
});

// ======================================================
// START
// ======================================================

async function startBot() {
  try {
    await registerCommands();
    await client.login(CONFIG.token);
  } catch (error) {
    console.error("Bot startup failed:", error);
    process.exitCode = 1;
  }
}

startBot();
