
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

const BRAND_COLOR = 0x1F4E79;
const OFFICE_URL = "https://discord.gg/DeuwuZFXN";
const DATA_DIR = path.join(__dirname, "..", "data");

fs.mkdirSync(DATA_DIR, { recursive: true });

function readData(filename, fallback = []) {
  const filepath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify(fallback, null, 2));
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch (error) {
    console.error(`Could not read ${filename}:`, error);
    return fallback;
  }
}

function writeData(filename, value) {
  const filepath = path.join(DATA_DIR, filename);
  const tempPath = `${filepath}.tmp`;

  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2));
  fs.renameSync(tempPath, filepath);
}

function makeEmbed(title, sections = []) {
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(title)
    .setDescription(
      sections.filter(Boolean).join("\n\n━━━━━━━━━━━━━━━━━━\n\n") ||
      "No information available."
    )
    .setFooter({ text: "London, Uxbridge" })
    .setTimestamp();
}

function isAdmin(interaction) {
  return Boolean(
    interaction.memberPermissions?.has(
      PermissionFlagsBits.Administrator
    )
  );
}

function hasRole(interaction, envName) {
  if (isAdmin(interaction)) return true;

  const roleId = process.env[envName];
  if (!roleId) return false;

  return interaction.member?.roles?.cache?.has(roleId) ?? false;
}

function denied() {
  return {
    embeds: [
      makeEmbed("Permission denied", [
        "You do not have permission to use this command."
      ])
    ],
    flags: MessageFlags.Ephemeral
  };
}

async function getGuild() {
  if (process.env.DISCORD_GUILD_ID) {
    return client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  }

  const guilds = await client.guilds.fetch();

  if (guilds.size !== 1) {
    throw new Error(
      "Set DISCORD_GUILD_ID when the bot is in multiple servers."
    );
  }

  return client.guilds.fetch(guilds.first().id);
}

async function sendToChannel(channelName, payload) {
  const guild = await getGuild();
  const channels = await guild.channels.fetch();

  const channel = channels.find(
    item =>
      item &&
      item.name.toLowerCase() === channelName.toLowerCase() &&
      item.isTextBased() &&
      typeof item.send === "function"
  );

  if (!channel) {
    throw new Error(
      `Channel #${channelName} was not found in ${guild.name}.`
    );
  }

  return channel.send(payload);
}

async function recordModeration(interaction, action, user, reason) {
  const logs = readData("modlogs.json", []);

  logs.push({
    action,
    userId: user.id,
    username: user.tag,
    reason,
    moderatorId: interaction.user.id,
    moderator: interaction.user.tag,
    guildId: interaction.guildId,
    timestamp: new Date().toISOString()
  });

  writeData("modlogs.json", logs);

  await sendToChannel("mod-logs", {
    embeds: [
      makeEmbed("Moderation record", [
        `**Action**\n${action}`,
        `**Member**\n${user.tag} (${user.id})`,
        `**Moderator**\n${interaction.user.tag}`,
        `**Reason**\n${reason || "No reason supplied"}`
      ])
    ]
  }).catch(error => {
    console.error("Moderation log delivery failed:", error.message);
  });
}

async function replySafely(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }

  return interaction.reply(payload);
}

const commands = [
  new SlashCommandBuilder()
    .setName("information")
    .setDescription("View community information"),

  new SlashCommandBuilder()
    .setName("rules")
    .setDescription("View community rules"),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get help from Community Relations Office"),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot response time"),

  new SlashCommandBuilder()
    .setName("host-shift")
    .setDescription("Start a timed roleplay shift")
    .addStringOption(o => o.setName("department")
      .setDescription("Department hosting the shift")
      .setRequired(true).setMaxLength(100))
    .addStringOption(o => o.setName("location")
      .setDescription("Shift location")
      .setRequired(true).setMaxLength(150))
    .addIntegerOption(o => o.setName("duration")
      .setDescription("Duration in minutes; defaults to 60")
      .setMinValue(5).setMaxValue(360)),

  new SlashCommandBuilder()
    .setName("shift-stats")
    .setDescription("View shift statistics"),

  new SlashCommandBuilder()
    .setName("military-operation")
    .setDescription("Start a timed military operation")
    .addStringOption(o => o.setName("operation")
      .setDescription("Operation name and location")
      .setRequired(true).setMaxLength(150))
    .addIntegerOption(o => o.setName("duration")
      .setDescription("Duration in minutes; defaults to 60")
      .setMinValue(5).setMaxValue(360)),

  new SlashCommandBuilder()
    .setName("training-session")
    .setDescription("Announce a department training session")
    .addStringOption(o => o.setName("department")
      .setDescription("Department")
      .setRequired(true).setMaxLength(100))
    .addStringOption(o => o.setName("details")
      .setDescription("Training details")
      .setRequired(true).setMaxLength(1500)),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Record a warning")
    .addUserOption(o => o.setName("member")
      .setDescription("Member to warn").setRequired(true))
    .addStringOption(o => o.setName("reason")
      .setDescription("Reason").setRequired(true).setMaxLength(1000)),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption(o => o.setName("member")
      .setDescription("Member to timeout").setRequired(true))
    .addIntegerOption(o => o.setName("minutes")
      .setDescription("Duration in minutes").setRequired(true)
      .setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName("reason")
      .setDescription("Reason").setRequired(true).setMaxLength(1000)),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(o => o.setName("member")
      .setDescription("Member to kick").setRequired(true))
    .addStringOption(o => o.setName("reason")
      .setDescription("Reason").setRequired(true).setMaxLength(1000)),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(o => o.setName("member")
      .setDescription("Member to ban").setRequired(true))
    .addStringOption(o => o.setName("reason")
      .setDescription("Reason").setRequired(true).setMaxLength(1000)),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete recent messages")
    .addIntegerOption(o => o.setName("amount")
      .setDescription("Number of messages").setRequired(true)
      .setMinValue(1).setMaxValue(100)),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("View member information")
    .addUserOption(o => o.setName("member")
      .setDescription("Member to inspect").setRequired(true)),

  new SlashCommandBuilder()
    .setName("modlogs")
    .setDescription("View moderation records")
    .addUserOption(o => o.setName("member")
      .setDescription("Optional member filter")),

  new SlashCommandBuilder()
    .setName("staff-report")
    .setDescription("Submit a staff conduct report")
    .addUserOption(o => o.setName("staff")
      .setDescription("Staff member being reported").setRequired(true))
    .addStringOption(o => o.setName("details")
      .setDescription("Report details").setRequired(true).setMaxLength(1500)),

  new SlashCommandBuilder()
    .setName("report")
    .setDescription("Submit a community report")
    .addStringOption(o => o.setName("details")
      .setDescription("Report details").setRequired(true).setMaxLength(1500)),

  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Submit a community suggestion")
    .addStringOption(o => o.setName("suggestion")
      .setDescription("Your suggestion").setRequired(true).setMaxLength(1500)),

  new SlashCommandBuilder()
    .setName("feedback")
    .setDescription("Send community feedback")
    .addStringOption(o => o.setName("message")
      .setDescription("Your feedback").setRequired(true).setMaxLength(1500)),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Publish a community announcement")
    .addStringOption(o => o.setName("title")
      .setDescription("Announcement title").setRequired(true).setMaxLength(200))
    .addStringOption(o => o.setName("message")
      .setDescription("Announcement content").setRequired(true).setMaxLength(3500))
].map(command => command.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

  const route = process.env.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      )
    : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

  await rest.put(route, { body: commands });
  console.log(`Registered ${commands.length} slash commands.`);
}

const shiftTimers = new Map();

function scheduleShiftEnd(shift) {
  if (shiftTimers.has(shift.id)) {
    clearTimeout(shiftTimers.get(shift.id));
  }

  const remaining = shift.endsAt - Date.now();

  if (remaining <= 0) {
    void finishShift(shift.id);
    return;
  }

  const timer = setTimeout(() => {
    shiftTimers.delete(shift.id);

    if (shift.endsAt <= Date.now()) {
      void finishShift(shift.id);
    } else {
      scheduleShiftEnd(shift);
    }
  }, Math.min(remaining, 2147000000));

  shiftTimers.set(shift.id, timer);
}

async function finishShift(id) {
  const shifts = readData("shifts.json", []);
  const index = shifts.findIndex(s => s.id === id);

  if (index === -1 || shifts[index].ended) return;

  const shift = shifts[index];

  if (shift.endsAt > Date.now()) {
    scheduleShiftEnd(shift);
    return;
  }

  shift.ended = true;
  shift.endedAt = Date.now();
  writeData("shifts.json", shifts);
  shiftTimers.delete(id);

  await sendToChannel("staff-shifts", {
    embeds: [
      makeEmbed(
        shift.type === "military"
          ? "Military operation concluded"
          : "Shift concluded",
        [
          `**Department**\n${shift.department}`,
          `**Location**\n${shift.location}`,
          `**Host**\n<@${shift.hostId}>`,
          `**Duration**\n${shift.duration} minutes`,
          "The scheduled session has concluded."
        ]
      )
    ]
  });
}

function startActivity(type, department, location, hostId, duration) {
  const shifts = readData("shifts.json", []);
  const now = Date.now();

  const shift = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    department,
    location,
    hostId,
    duration,
    startedAt: now,
    endsAt: now + duration * 60000,
    ended: false
  };

  shifts.push(shift);
  writeData("shifts.json", shifts);
  scheduleShiftEnd(shift);

  return shift;
}

client.once("ready", () => {
  console.log(`Online as ${client.user.tag}`);

  for (const shift of readData("shifts.json", [])) {
    if (!shift.ended) scheduleShiftEnd(shift);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;

  try {
    if (command === "information") {
      return interaction.reply({
        embeds: [makeEmbed("London, Uxbridge", [
          "**Community information**\nA British Roblox roleplay community based in Uxbridge, West London.",
          "**Roleplay services**\nMetropolitan Police Service, London Fire Brigade, London Ambulance Service, British Transport Police, British Army, civilian services and private businesses.",
          "**Community standards**\nRespect other members, follow staff instructions and keep roleplay organised.",
          "**Disclaimer**\nThis is a fictional Roblox roleplay community and is not affiliated with real government bodies or public services."
        ])]
      });
    }

    if (command === "rules") {
      return interaction.reply({
        embeds: [makeEmbed("Community rules", [
          "**01 — Respect**\nTreat all members respectfully.",
          "**02 — Staff instructions**\nFollow reasonable moderation instructions.",
          "**03 — Roleplay conduct**\nRandom deathmatching, vehicle deathmatching, fail roleplay, metagaming and powergaming are prohibited.",
          "**04 — Exploiting**\nCheating, exploiting and abusing bugs are prohibited.",
          "**05 — Authority**\nDo not abuse department roles or powers.",
          "**06 — Advertising**\nDo not spam or advertise without permission.",
          "**07 — Impersonation**\nDo not impersonate staff or public-service personnel.",
          "**08 — Operations**\nDo not conduct unauthorised official operations.",
          "**Enforcement**\nViolations may result in warnings, timeouts, removal or bans depending on severity."
        ])]
      });
    }

    if (command === "help") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Join Community Relations Office")
          .setStyle(ButtonStyle.Link)
          .setURL(OFFICE_URL)
      );

      return interaction.reply({
        embeds: [makeEmbed("Community Relations Office", [
          "Need assistance or want to report a concern?",
          "Join the Community Relations Office to raise complaints, report staff misconduct and contact the moderation team for London, Uxbridge."
        ])],
        components: [row]
      });
    }

    if (command === "ping") {
      return interaction.reply({
        embeds: [makeEmbed("Bot status", [
          `**WebSocket latency**\n${client.ws.ping} ms`
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (command === "host-shift") {
      if (!hasRole(interaction, "SHIFT_HOST_ROLE_ID")) {
        return interaction.reply(denied());
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const department = interaction.options.getString("department", true);
      const location = interaction.options.getString("location", true);
      const duration = interaction.options.getInteger("duration") ?? 60;

      const shift = startActivity(
        "shift", department, location, interaction.user.id, duration
      );

      await sendToChannel("staff-shifts", {
        embeds: [makeEmbed("Shift now open", [
          `**Department**\n${department}`,
          `**Location**\n${location}`,
          `**Host**\n<@${interaction.user.id}>`,
          `**Duration**\n${duration} minutes`,
          `**Scheduled conclusion**\n<t:${Math.floor(shift.endsAt / 1000)}:F>`
        ])]
      });

      return interaction.editReply({
        embeds: [makeEmbed("Shift started", [
          `The shift is scheduled to conclude <t:${Math.floor(shift.endsAt / 1000)}:R>.`
        ])]
      });
    }

    if (command === "military-operation") {
      if (!hasRole(interaction, "MILITARY_HOST_ROLE_ID")) {
        return interaction.reply(denied());
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const operation = interaction.options.getString("operation", true);
      const duration = interaction.options.getInteger("duration") ?? 60;

      const shift = startActivity(
        "military", "British Army", operation, interaction.user.id, duration
      );

      await sendToChannel("staff-shifts", {
        embeds: [makeEmbed("Military operation opened", [
          `**Operation**\n${operation}`,
          `**Host**\n<@${interaction.user.id}>`,
          `**Duration**\n${duration} minutes`,
          `**Scheduled conclusion**\n<t:${Math.floor(shift.endsAt / 1000)}:F>`
        ])]
      });

      return interaction.editReply({
        embeds: [makeEmbed("Operation scheduled", [
          `The operation is scheduled to conclude <t:${Math.floor(shift.endsAt / 1000)}:R>.`
        ])]
      });
    }

    if (command === "shift-stats") {
      if (!hasRole(interaction, "SHIFT_HOST_ROLE_ID")) {
        return interaction.reply(denied());
      }

      const shifts = readData("shifts.json", []);
      return interaction.reply({
        embeds: [makeEmbed("Shift statistics", [
          `**Total recorded**\n${shifts.length}`,
          `**Active**\n${shifts.filter(s => !s.ended).length}`,
          `**Completed**\n${shifts.filter(s => s.ended).length}`
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (command === "training-session") {
      if (!hasRole(interaction, "DEPARTMENT_STAFF_ROLE_ID")) {
        return interaction.reply(denied());
      }

      const department = interaction.options.getString("department", true);
      const details = interaction.options.getString("details", true);

      await sendToChannel("staff-shifts", {
        embeds: [makeEmbed("Training session announced", [
          `**Department**\n${department}`,
          `**Organiser**\n<@${interaction.user.id}>`,
          `**Details**\n${details}`
        ])]
      });

      return interaction.reply({
        embeds: [makeEmbed("Training session announced", [
          "The announcement has been published."
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (command === "warn") {
      if (!hasRole(interaction, "MODERATOR_ROLE_ID")) {
        return interaction.reply(denied());
      }

      const user = interaction.options.getUser("member", true);
      const reason = interaction.options.getString("reason", true);

      await recordModeration(interaction, "Warning", user, reason);

      return interaction.reply({
        embeds: [makeEmbed("Warning recorded", [
          `**Member**\n${user.tag}`,
          `**Reason**\n${reason}`
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (command === "timeout") {
      if (!hasRole(interaction, "MODERATOR_ROLE_ID")) {
        return interaction.reply(denied());
      }

      const user = interaction.options.getUser("member", true);
      const minutes = interaction.options.getInteger("minutes", true);
      const reason = interaction.options.getString("reason", true);
      const member = await interaction.guild.members.fetch(user.id);

      if (user.id === interaction.user.id || user.id === client.user.id) {
        return interaction.reply({
          embeds: [makeEmbed("Action unsuccessful", [
            "You cannot timeout yourself or the bot."
          ])],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!member.moderatable) {
        return interaction.reply({
          embeds: [makeEmbed("Action unsuccessful", [
            "This member cannot be timed out. Check the bot's permissions and role hierarchy."
          ])],
          flags: MessageFlags.Ephemeral
        });
      }

      await member.timeout(minutes * 60000, reason);
      await recordModeration(interaction, `Timeout (${minutes} minutes)`, user, reason);

      return interaction.reply({
        embeds: [makeEmbed("Timeout applied", [
          `**Member**\n${user.tag}`,
          `**Duration**\n${minutes} minutes`,
          `**Reason**\n${reason}`
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (command === "kick" || command === "ban") {
      const allowed = command === "ban"
        ? hasRole(interaction, "SENIOR_MODERATOR_ROLE_ID")
        : hasRole(interaction, "MODERATOR_ROLE_ID");

      if (!allowed) return interaction.reply(denied());

      const user = interaction.options.getUser("member", true);
      const reason = interaction.options.getString("reason", true);

      if (user.id === interaction.user.id || user.id === client.user.id) {
        return interaction.reply({
          embeds: [makeEmbed("Action unsuccessful", [
            "You cannot target yourself or the bot."
          ])],
          flags: MessageFlags.Ephemeral
        });
      }

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        return interaction.reply({
          embeds: [makeEmbed("Action unsuccessful", [
            "The member could not be found in this server."
          ])],
          flags: MessageFlags.Ephemeral
        });
      }

      if (command === "kick" && !member.kickable) {
        return interaction.reply({
          embeds: [makeEmbed("Action unsuccessful", [
            "The bot cannot kick this member. Check role hierarchy and permissions."
          ])],
          flags: MessageFlags.Ephemeral
        });
      }

      if (command === "ban" && !member.bannable) {
        return interaction.reply({
          embeds: [makeEmbed("Action unsuccessful", [
            "The bot cannot ban this member. Check role hierarchy and permissions."
          ])],
          flags: MessageFlags.Ephemeral
        });
      }

      if (command === "kick") await member.kick(reason);
      else await member.ban({ reason });

      await recordModeration(interaction, command, user, reason);

      return interaction.reply({
        embeds: [makeEmbed("Moderation action completed", [
          `**Action**\n${command}`,
          `**Member**\n${user.tag}`,
          `**Reason**\n${reason}`
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (command === "purge") {
      if (!hasRole(interaction, "MODERATOR_ROLE_ID")) {
        return interaction.reply(denied());
      }

      const amount = interaction.options.getInteger("amount", true);

      if (!interaction.channel?.bulkDelete) {
        return interaction.reply({
          embeds: [makeEmbed("Purge unsuccessful", [
            "This command cannot be used in this channel."
          ])],
          flags: MessageFlags.Ephemeral
        });
      }

      const deleted = await interaction.channel.bulkDelete(amount, true);

      await sendToChannel("mod-logs", {
        embeds: [makeEmbed("Moderation record", [
          "**Action**\nPurge",
          `**Moderator**\n${interaction.user.tag}`,
          `**Channel**\n#${interaction.channel.name}`,
          `**Messages deleted**\n${deleted.size}`
        ])]
      }).catch(error => console.error("Purge log failed:", error.message));

      return interaction.reply({
        embeds: [makeEmbed("Messages deleted", [
          `**Deleted**\n${deleted.size} messages`,
          "Messages older than 14 days cannot be bulk-deleted."
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (command === "userinfo") {
      if (!hasRole(interaction, "MODERATOR_ROLE_ID")) {
        return interaction.reply(denied());
      }

      const user = interaction.options.getUser("member", true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      return interaction.reply({
        embeds: [makeEmbed("Member information", [
          `**Username**\n${user.tag}`,
          `**User ID**\n${user.id}`,
          `**Account created**\n<t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
          `**Joined server**\n${member?.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
            : "Not available"}`
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (command === "modlogs") {
      if (!hasRole(interaction, "MODERATOR_ROLE_ID")) {
        return interaction.reply(denied());
      }

      const user = interaction.options.getUser("member");
      const logs = readData("modlogs.json", [])
        .filter(entry => !user || entry.userId === user.id)
        .slice(-8)
        .reverse();

      return interaction.reply({
        embeds: [makeEmbed("Recent moderation records",
          logs.length
            ? logs.map(entry =>
                `**${entry.action}**\n` +
                `**Member**\n${entry.username} (${entry.userId})\n` +
                `**Reason**\n${entry.reason}\n` +
                `**When**\n<t:${Math.floor(new Date(entry.timestamp).getTime() / 1000)}:R>`
              )
            : ["No matching records were found."]
        )],
        flags: MessageFlags.Ephemeral
      });
    }

    if (command === "staff-report" || command === "report") {
      const details = interaction.options.getString("details", true);
      const staff = command === "staff-report"
        ? interaction.options.getUser("staff", true)
        : null;

      await sendToChannel("reports", {
        embeds: [makeEmbed(
          command === "staff-report" ? "Staff conduct report" : "Community report",
          [
            `**Submitted by**\n<@${interaction.user.id}>`,
            ...(staff ? [`**Staff member reported**\n<@${staff.id}>`] : []),
            `**Details**\n${details}`
          ]
        )]
      });

      return interaction.reply({
        embeds: [makeEmbed("Report submitted", [
          "Your report has been sent to the review team."
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (command === "suggest" || command === "feedback") {
      const suggestion = command === "suggest";
      const text = interaction.options.getString(
        suggestion ? "suggestion" : "message", true
      );

      await sendToChannel(suggestion ? "suggestions" : "feedback", {
        embeds: [makeEmbed(
          suggestion ? "Community suggestion" : "Community feedback",
          [
            `**Submitted by**\n<@${interaction.user.id}>`,
            `**Content**\n${text}`
          ]
        )]
      });

      return interaction.reply({
        embeds: [makeEmbed(
          suggestion ? "Suggestion submitted" : "Feedback submitted",
          ["Your message has been sent for review."]
        )],
        flags: MessageFlags.Ephemeral
      });
    }

    if (command === "announce") {
      if (!hasRole(interaction, "SENIOR_MODERATOR_ROLE_ID")) {
        return interaction.reply(denied());
      }

      const title = interaction.options.getString("title", true);
      const message = interaction.options.getString("message", true);

      await sendToChannel("announcements", {
        embeds: [makeEmbed(title, [
          message,
          `**Published by**\n${interaction.user.tag}`
        ])]
      });

      return interaction.reply({
        embeds: [makeEmbed("Announcement published", [
          "Your announcement has been sent."
        ])],
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error(`Error in /${command}:`, error);

    return replySafely(interaction, {
      embeds: [makeEmbed("Command error", [
        "The command could not be completed. Check the bot logs and channel configuration."
      ])],
      flags: MessageFlags.Ephemeral
    }).catch(console.error);
  }
});

async function main() {
  if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID) {
    throw new Error("DISCORD_TOKEN and DISCORD_CLIENT_ID must be configured.");
  }

  await registerCommands();
  await client.login(process.env.DISCORD_TOKEN);
}

main().catch(error => {
  console.error("Bot startup failed:", error);
  process.exit(1);
});
