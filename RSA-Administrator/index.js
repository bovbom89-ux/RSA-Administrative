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
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const BRAND = 0x1F4E79;
const OFFICE_URL = "https://discord.gg/DeuwuZFXN";
const DATA_DIR = path.join(__dirname, "..", "data");

fs.mkdirSync(DATA_DIR, { recursive: true });

function readData(name, fallback = []) {
  const file = path.join(DATA_DIR, name);

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeData(name, data) {
  fs.writeFileSync(
    path.join(DATA_DIR, name),
    JSON.stringify(data, null, 2)
  );
}

function makeEmbed(title, sections = [], footer = "London, Uxbridge") {
  const description = sections
    .filter(Boolean)
    .join("\n\n━━━━━━━━━━━━━━━━━━\n\n");

  return new EmbedBuilder()
    .setColor(BRAND)
    .setTitle(title)
    .setDescription(description || "No information available.")
    .setFooter({ text: footer })
    .setTimestamp();
}

function isAdmin(interaction) {
  return interaction.memberPermissions?.has(
    PermissionFlagsBits.Administrator
  );
}

function hasRole(interaction, envName) {
  const roleId = process.env[envName];

  if (!roleId) return false;
  if (isAdmin(interaction)) return true;

  return interaction.member?.roles?.cache?.has(roleId) ?? false;
}

function deny() {
  return {
    embeds: [
      makeEmbed("Permission denied", [
        "You do not have permission to use this command."
      ])
    ],
    flags: MessageFlags.Ephemeral
  };
}

async function sendToChannel(channelId, message) {
  if (!channelId) {
    throw new Error("The destination channel ID has not been configured.");
  }

  const channel = await client.channels.fetch(channelId);

  if (!channel?.isTextBased() || !channel.send) {
    throw new Error("The configured destination is not a text channel.");
  }

  return channel.send(message);
}

async function logAction(interaction, action, target, reason) {
  const logs = readData("modlogs.json", []);

  logs.push({
    action,
    target,
    reason,
    moderator: interaction.user.id,
    guild: interaction.guildId,
    timestamp: new Date().toISOString()
  });

  writeData("modlogs.json", logs);

  if (process.env.MODLOG_CHANNEL_ID) {
    await sendToChannel(process.env.MODLOG_CHANNEL_ID, {
      embeds: [
        makeEmbed("Moderation record", [
          `**Action**\n${action}`,
          `**Member**\n${target}`,
          `**Moderator**\n${interaction.user.tag}`,
          `**Reason**\n${reason || "No reason supplied"}`
        ])
      ]
    }).catch(console.error);
  }
}

async function safeReply(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }

  return interaction.reply(payload);
}

const commands = [
  new SlashCommandBuilder()
    .setName("information")
    .setDescription("View London, Uxbridge community information"),

  new SlashCommandBuilder()
    .setName("rules")
    .setDescription("View the community rules"),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get help from the Community Relations Office"),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot response time"),

  new SlashCommandBuilder()
    .setName("host-shift")
    .setDescription("Start a timed roleplay shift")
    .addStringOption(o =>
      o.setName("department")
        .setDescription("Department hosting the shift")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("location")
        .setDescription("Shift location")
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName("duration")
        .setDescription("Duration in minutes")
        .setMinValue(5)
        .setMaxValue(360)
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName("shift-stats")
    .setDescription("View shift statistics"),

  new SlashCommandBuilder()
    .setName("military-operation")
    .setDescription("Start a timed military operation")
    .addStringOption(o =>
      o.setName("operation")
        .setDescription("Operation name")
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName("duration")
        .setDescription("Duration in minutes")
        .setMinValue(5)
        .setMaxValue(360)
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName("training-session")
    .setDescription("Announce a department training session")
    .addStringOption(o =>
      o.setName("department")
        .setDescription("Department running training")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("details")
        .setDescription("Training details")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption(o =>
      o.setName("member").setDescription("Member to warn").setRequired(true))
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason").setRequired(true)),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption(o =>
      o.setName("member").setDescription("Member to timeout").setRequired(true))
    .addIntegerOption(o =>
      o.setName("minutes").setDescription("Timeout length in minutes")
        .setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason").setRequired(true)),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(o =>
      o.setName("member").setDescription("Member to kick").setRequired(true))
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason").setRequired(true)),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(o =>
      o.setName("member").setDescription("Member to ban").setRequired(true))
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason").setRequired(true)),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete recent messages")
    .addIntegerOption(o =>
      o.setName("amount").setDescription("Number of messages")
        .setMinValue(1).setMaxValue(100).setRequired(true)),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("View member information")
    .addUserOption(o =>
      o.setName("member").setDescription("Member to inspect").setRequired(true)),

  new SlashCommandBuilder()
    .setName("modlogs")
    .setDescription("View recent moderation records")
    .addUserOption(o =>
      o.setName("member").setDescription("Filter by member").setRequired(false)),

  new SlashCommandBuilder()
    .setName("staff-report")
    .setDescription("Submit a staff conduct report")
    .addUserOption(o =>
      o.setName("staff").setDescription("Staff member being reported").setRequired(true))
    .addStringOption(o =>
      o.setName("details").setDescription("Report details").setRequired(true)),

  new SlashCommandBuilder()
    .setName("report")
    .setDescription("Report a community concern")
    .addStringOption(o =>
      o.setName("details").setDescription("Report details").setRequired(true)),

  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Submit a community suggestion")
    .addStringOption(o =>
      o.setName("suggestion").setDescription("Your suggestion").setRequired(true)),

  new SlashCommandBuilder()
    .setName("feedback")
    .setDescription("Send community feedback")
    .addStringOption(o =>
      o.setName("message").setDescription("Your feedback").setRequired(true)),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Publish a community announcement")
    .addStringOption(o =>
      o.setName("title").setDescription("Announcement title").setRequired(true))
    .addStringOption(o =>
      o.setName("message").setDescription("Announcement content").setRequired(true)),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("View server information")
].map(command => command.toJSON());

// Register commands on startup.
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

// Persistent timed shifts.
const shiftTimers = new Map();

function scheduleShiftEnd(shift) {
  if (shiftTimers.has(shift.id)) {
    clearTimeout(shiftTimers.get(shift.id));
  }

  const remaining = shift.endsAt - Date.now();

  if (remaining <= 0) {
    finishShift(shift.id).catch(console.error);
    return;
  }

  const timer = setTimeout(() => {
    finishShift(shift.id).catch(console.error);
  }, Math.min(remaining, 2147483647));

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

  await sendToChannel(process.env.SHIFT_CHANNEL_ID, {
    embeds: [
      makeEmbed("Shift concluded", [
        `**Department**\n${shift.department}`,
        `**Location**\n${shift.location}`,
        `**Host**\n<@${shift.hostId}>`,
        `**Duration**\n${shift.duration} minutes`,
        "The scheduled shift has now concluded."
      ])
    ]
  });
}

function startShift({ type, department, location, hostId, duration }) {
  const shifts = readData("shifts.json", []);

  const shift = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    department,
    location,
    hostId,
    duration,
    startedAt: Date.now(),
    endsAt: Date.now() + duration * 60_000,
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

  const { commandName } = interaction;

  try {
    if (commandName === "information") {
      return interaction.reply({
        embeds: [makeEmbed("London, Uxbridge", [
          "**Community information**\nA British Roblox roleplay community based in Uxbridge, West London.",
          "**Roleplay departments**\nMetropolitan Police Service, London Fire Brigade, London Ambulance Service, British Transport Police, British Army, civilian services and private businesses.",
          "**Community standards**\nRespect other members, follow staff instructions and keep roleplay fair and organised.",
          "**Disclaimer**\nThis is a fictional Roblox roleplay community and is not affiliated with real public services or government bodies."
        ])]
      });
    }

    if (commandName === "rules") {
      return interaction.reply({
        embeds: [makeEmbed("Community rules", [
          "**01 — Respect**\nTreat all members respectfully.",
          "**02 — Staff instructions**\nFollow reasonable moderation instructions.",
          "**03 — Roleplay conduct**\nNo random deathmatching, vehicle deathmatching, fail roleplay, metagaming or powergaming.",
          "**04 — Exploiting**\nExploiting, cheating and abuse of bugs are prohibited.",
          "**05 — Authority**\nDo not abuse department roles or powers.",
          "**06 — Advertising**\nDo not spam or advertise without permission.",
          "**07 — Impersonation**\nDo not impersonate staff or public-service personnel.",
          "**08 — Operations**\nDo not conduct unauthorised official operations.",
          "**Enforcement**\nViolations may result in warnings, timeouts, removal or bans depending on severity."
        ])]
      });
    }

    if (commandName === "help") {
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

    if (commandName === "ping") {
      return interaction.reply({
        embeds: [makeEmbed("Bot status", [
          `**WebSocket latency**\n${client.ws.ping} ms`
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (commandName === "host-shift") {
      if (!hasRole(interaction, "SHIFT_HOST_ROLE_ID")) {
        return interaction.reply(deny());
      }

      await interaction.deferReply();

      const department = interaction.options.getString("department", true);
      const location = interaction.options.getString("location", true);
      const duration = interaction.options.getInteger("duration") ?? 60;

      const shift = startShift({
        type: "shift",
        department,
        location,
        hostId: interaction.user.id,
        duration
      });

      await sendToChannel(process.env.SHIFT_CHANNEL_ID, {
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
          `Your shift has been scheduled to end <t:${Math.floor(shift.endsAt / 1000)}:R>.`
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (commandName === "military-operation") {
      if (!hasRole(interaction, "MILITARY_HOST_ROLE_ID")) {
        return interaction.reply(deny());
      }

      await interaction.deferReply();

      const operation = interaction.options.getString("operation", true);
      const duration = interaction.options.getInteger("duration") ?? 60;

      const shift = startShift({
        type: "military",
        department: "British Army",
        location: operation,
        hostId: interaction.user.id,
        duration
      });

      await sendToChannel(process.env.SHIFT_CHANNEL_ID, {
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
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (commandName === "shift-stats") {
      if (!hasRole(interaction, "SHIFT_HOST_ROLE_ID")) {
        return interaction.reply(deny());
      }

      const shifts = readData("shifts.json", []);
      const completed = shifts.filter(s => s.ended).length;
      const active = shifts.filter(s => !s.ended).length;

      return interaction.reply({
        embeds: [makeEmbed("Shift statistics", [
          `**Total recorded**\n${shifts.length}`,
          `**Active**\n${active}`,
          `**Completed**\n${completed}`
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (commandName === "training-session") {
      if (!hasRole(interaction, "DEPARTMENT_STAFF_ROLE_ID")) {
        return interaction.reply(deny());
      }

      const department = interaction.options.getString("department", true);
      const details = interaction.options.getString("details", true);

      await sendToChannel(process.env.SHIFT_CHANNEL_ID, {
        embeds: [makeEmbed("Training session announced", [
          `**Department**\n${department}`,
          `**Organiser**\n<@${interaction.user.id}>`,
          `**Details**\n${details}`
        ])]
      });

      return interaction.reply({
        embeds: [makeEmbed("Training session announced", [
          "The training announcement has been published."
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (commandName === "warn") {
      if (!hasRole(interaction, "MODERATOR_ROLE_ID")) {
        return interaction.reply(deny());
      }

      const user = interaction.options.getUser("member", true);
      const reason = interaction.options.getString("reason", true);

      await logAction(interaction, "Warning", user.tag, reason);

      return interaction.reply({
        embeds: [makeEmbed("Warning recorded", [
          `**Member**\n${user.tag}`,
          `**Reason**\n${reason}`
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (commandName === "timeout") {
      if (!hasRole(interaction, "MODERATOR_ROLE_ID")) {
        return interaction.reply(deny());
      }

      const user = interaction.options.getUser("member", true);
      const minutes = interaction.options.getInteger("minutes", true);
      const reason = interaction.options.getString("reason", true);
      const member = await interaction.guild.members.fetch(user.id);

      if (!member.moderatable) {
        return interaction.reply({
          embeds: [makeEmbed("Action unsuccessful", [
            "This member cannot be timed out. Check role hierarchy and bot permissions."
          ])],
          flags: MessageFlags.Ephemeral
        });
      }

      await member.timeout(minutes * 60_000, reason);
      await logAction(interaction, `Timeout (${minutes} minutes)`, user.tag, reason);

      return interaction.reply({
        embeds: [makeEmbed("Timeout applied", [
          `**Member**\n${user.tag}`,
          `**Duration**\n${minutes} minutes`,
          `**Reason**\n${reason}`
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (commandName === "kick" || commandName === "ban") {
      const authorised = commandName === "ban"
        ? hasRole(interaction, "SENIOR_MODERATOR_ROLE_ID")
        : hasRole(interaction, "MODERATOR_ROLE_ID");

      if (!authorised) return interaction.reply(deny());

      const user = interaction.options.getUser("member", true);
      const reason = interaction.options.getString("reason", true);
      const member = await interaction.guild.members.fetch(user.id)
        .catch(() => null);

      if (!member) {
        return interaction.reply({
          embeds: [makeEmbed("Action unsuccessful", [
            "The member could not be found in this server."
          ])],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!member.moderatable || (commandName === "kick" && !member.kickable)) {
        return interaction.reply({
          embeds: [makeEmbed("Action unsuccessful", [
            "The bot cannot moderate this member. Check the role hierarchy and bot permissions."
          ])],
          flags: MessageFlags.Ephemeral
        });
      }

      if (commandName === "kick") await member.kick(reason);
      else await member.ban({ reason });

      await logAction(interaction, commandName, user.tag, reason);

      return interaction.reply({
        embeds: [makeEmbed("Moderation action completed", [
          `**Action**\n${commandName}`,
          `**Member**\n${user.tag}`,
          `**Reason**\n${reason}`
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (commandName === "purge") {
      if (!hasRole(interaction, "MODERATOR_ROLE_ID")) {
        return interaction.reply(deny());
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

      await logAction(interaction, "Purge", `${deleted.size} messages`, "Bulk message deletion");

      return interaction.reply({
        embeds: [makeEmbed("Messages deleted", [
          `**Deleted**\n${deleted.size} messages`,
          "Messages older than 14 days cannot be bulk-deleted."
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (commandName === "userinfo") {
      if (!hasRole(interaction, "MODERATOR_ROLE_ID")) {
        return interaction.reply(deny());
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

    if (commandName === "modlogs") {
      if (!hasRole(interaction, "MODERATOR_ROLE_ID")) {
        return interaction.reply(deny());
      }

      const user = interaction.options.getUser("member");
      const logs = readData("modlogs.json", [])
        .filter(log => !user || log.target.includes(user.id) || log.target === user.tag)
        .slice(-10)
        .reverse();

      return interaction.reply({
        embeds: [makeEmbed("Recent moderation records", logs.length
          ? logs.map(log =>
              `**${log.action}**\nMember: ${log.target}\nReason: ${log.reason}\n<t:${Math.floor(new Date(log.timestamp).getTime() / 1000)}:R>`
            )
          : ["No matching moderation records were found."]
        )],
        flags: MessageFlags.Ephemeral
      });
    }

    if (commandName === "staff-report" || commandName === "report") {
      const details = interaction.options.getString("details", true);
      const staff = commandName === "staff-report"
        ? interaction.options.getUser("staff", true)
        : null;

      await sendToChannel(process.env.REPORT_CHANNEL_ID, {
        embeds: [makeEmbed(
          commandName === "staff-report" ? "Staff conduct report" : "Community report",
          [
            `**Submitted by**\n<@${interaction.user.id}>`,
            ...(staff ? [`**Staff member reported**\n<@${staff.id}>`] : []),
            `**Details**\n${details}`
          ]
        )]
      });

      return interaction.reply({
        embeds: [makeEmbed("Report submitted", [
          "Your report has been sent to the designated review team."
        ])],
        flags: MessageFlags.Ephemeral
      });
    }

    if (commandName === "suggest" || commandName === "feedback") {
      const isSuggestion = commandName === "suggest";
      const text = interaction.options.getString(
        isSuggestion ? "suggestion" : "message",
        true
      );

      const channelId = isSuggestion
        ? process.env.SUGGESTION_CHANNEL_ID
        : process.env.FEEDBACK_CHANNEL_ID;

      await sendToChannel(channelId, {
        embeds: [makeEmbed(
          isSuggestion ? "Community suggestion" : "Community feedback",
          [
            `**Submitted by**\n<@${interaction.user.id}>`,
            `**Content**\n${text}`
          ]
        )]
      });

      return interaction.reply({
        embeds: [makeEmbed(
          isSuggestion ? "Suggestion submitted" : "Feedback submitted",
          ["Thank you. Your message has been sent for review."]
        )],
        flags: MessageFlags.Ephemeral
      });
    }

    if (commandName === "announce") {
      if (!hasRole(interaction, "SENIOR_MODERATOR_ROLE_ID")) {
        return interaction.reply(deny());
      }

      const title = interaction.options.getString("title", true);
      const message = interaction.options.getString("message", true);

      await sendToChannel(process.env.ANNOUNCEMENT_CHANNEL_ID, {
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

    if (commandName === "serverinfo") {
      const guild = interaction.guild;

      return interaction.reply({
        embeds: [makeEmbed("Server information", [
          `**Server**\n${guild.name}`,
          `**Server ID**\n${guild.id}`,
          `**Members**\n${guild.memberCount}`,
          `**Created**\n<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
        ])]
      });
    }
  } catch (error) {
    console.error(`Error in /${commandName}:`, error);

    const payload = {
      embeds: [makeEmbed("Command error", [
        "The command could not be completed. Check the bot logs and configuration."
      ])],
      flags: MessageFlags.Ephemeral
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(console.error);
    } else {
      await interaction.reply(payload).catch(console.error);
    }
  }
});

async function main() {
  const required = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID"];

  for (const name of required) {
    if (!process.env[name]) {
      throw new Error(`${name} is missing from the environment variables.`);
    }
  }

  await registerCommands();
  await client.login(process.env.DISCORD_TOKEN);
}

main().catch(error => {
  console.error("Bot startup failed:", error);
  process.exit(1);
});
