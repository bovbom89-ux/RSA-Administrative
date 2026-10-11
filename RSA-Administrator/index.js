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
  MessageFlags,
  ChannelType
} = require("discord.js");

// ==========================================
// CONFIGURATION
// ==========================================

const BRAND_COLOR = 0x1F4E79;
const OFFICE_URL = "https://discord.gg/DeuwuZFXN";
const DATA_DIR = path.join(__dirname, "..", "data");

fs.mkdirSync(DATA_DIR, { recursive: true });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

// ==========================================
// ENVIRONMENT VALIDATION
// ==========================================

function validateEnvironment() {
  const required = [
    "DISCORD_TOKEN",
    "DISCORD_CLIENT_ID",
    "DISCORD_GUILD_ID"
  ];

  const missing = required.filter(name => {
    const value = process.env[name]?.trim();

    return (
      !value ||
      value.startsWith("YOUR_") ||
      value.includes("YOUR_ACTUAL_")
    );
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing or placeholder environment variables: ${missing.join(", ")}`
    );
  }

  for (const name of ["DISCORD_CLIENT_ID", "DISCORD_GUILD_ID"]) {
    if (!/^\d{17,20}$/.test(process.env[name].trim())) {
      throw new Error(
        `${name} must contain your actual Discord numeric ID.`
      );
    }
  }
}

// ==========================================
// DATA STORAGE
// ==========================================

function readData(filename, fallback = []) {
  const file = path.join(DATA_DIR, filename);

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    return fallback;
  }

  try {
    const result = JSON.parse(fs.readFileSync(file, "utf8"));

    return Array.isArray(result) ? result : fallback;
  } catch (error) {
    console.error(`Failed to read ${filename}:`, error);
    return fallback;
  }
}

function writeData(filename, data) {
  const file = path.join(DATA_DIR, filename);
  const temp = `${file}.tmp`;

  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, file);
}

// ==========================================
// EMBEDS
// ==========================================

function makeEmbed(title, sections = []) {
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(title)
    .setDescription(
      sections.filter(Boolean).join(
        "\n\n━━━━━━━━━━━━━━━━━━\n\n"
      ) || "No information available."
    )
    .setFooter({
      text: "London, Uxbridge"
    })
    .setTimestamp();
}

// ==========================================
// PERMISSIONS AND ROLE CHECKS
// ==========================================

function isAdmin(interaction) {
  return Boolean(
    interaction.memberPermissions?.has(
      PermissionFlagsBits.Administrator
    )
  );
}

function hasRole(interaction, envName) {
  if (isAdmin(interaction)) return true;

  const roleId = process.env[envName]?.trim();

  if (
    !roleId ||
    roleId.startsWith("YOUR_") ||
    !/^\d{17,20}$/.test(roleId)
  ) {
    return false;
  }

  return interaction.member?.roles?.cache?.has(roleId) ?? false;
}

function canModerate(interaction) {
  return (
    hasRole(interaction, "GROUP_MODERATION_ROLE_ID") ||
    hasRole(interaction, "GROUP_SENIOR_MODERATION_ROLE_ID")
  );
}

function canSeniorModerate(interaction) {
  return hasRole(
    interaction,
    "GROUP_SENIOR_MODERATION_ROLE_ID"
  );
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

// ==========================================
// SAFE INTERACTION RESPONSES
// ==========================================

async function replySafely(interaction, payload) {
  if (interaction.deferred) {
    return interaction.editReply(payload);
  }

  if (interaction.replied) {
    return interaction.followUp(payload);
  }

  return interaction.reply(payload);
}

// ==========================================
// SERVER AND CHANNEL HELPERS
// ==========================================

async function getGuild() {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();

  if (guildId) {
    return client.guilds.fetch(guildId);
  }

  const guilds = await client.guilds.fetch();

  if (guilds.size !== 1) {
    throw new Error(
      "Set DISCORD_GUILD_ID to your Discord server ID."
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
      `Channel #${channelName} was not found.`
    );
  }

  return channel.send(payload);
}

// ==========================================
// MODERATION LOGGING
// ==========================================

async function recordModeration(
  interaction,
  action,
  user,
  reason
) {
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
    console.error(
      "Could not send moderation log:",
      error.message
    );
  });
}

// ==========================================
// SLASH COMMAND DEFINITIONS
// ==========================================

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
    .addStringOption(o =>
      o.setName("department")
        .setDescription("Department hosting the shift")
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(o =>
      o.setName("location")
        .setDescription("Shift location")
        .setRequired(true)
        .setMaxLength(150)
    )
    .addIntegerOption(o =>
      o.setName("duration")
        .setDescription("Duration in minutes; defaults to 60")
        .setMinValue(5)
        .setMaxValue(360)
    ),

  new SlashCommandBuilder()
    .setName("shift-stats")
    .setDescription("View shift statistics"),

  new SlashCommandBuilder()
    .setName("military-operation")
    .setDescription("Start a timed military operation")
    .addStringOption(o =>
      o.setName("operation")
        .setDescription("Operation name and location")
        .setRequired(true)
        .setMaxLength(150)
    )
    .addIntegerOption(o =>
      o.setName("duration")
        .setDescription("Duration in minutes; defaults to 60")
        .setMinValue(5)
        .setMaxValue(360)
    ),

  new SlashCommandBuilder()
    .setName("training-session")
    .setDescription("Announce a department training session")
    .addStringOption(o =>
      o.setName("department")
        .setDescription("Department")
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(o =>
      o.setName("details")
        .setDescription("Training details")
        .setRequired(true)
        .setMaxLength(1500)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Record a warning")
    .addUserOption(o =>
      o.setName("member")
        .setDescription("Member to warn")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")
        .setRequired(true)
        .setMaxLength(1000)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption(o =>
      o.setName("member")
        .setDescription("Member to timeout")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("minutes")
        .setDescription("Duration in minutes")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")
        .setRequired(true)
        .setMaxLength(1000)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(o =>
      o.setName("member")
        .setDescription("Member to kick")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")
        .setRequired(true)
        .setMaxLength(1000)
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(o =>
      o.setName("member")
        .setDescription("Member to ban")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")
        .setRequired(true)
        .setMaxLength(1000)
    ),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete recent messages")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("Number of messages")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("View member information")
    .addUserOption(o =>
      o.setName("member")
        .setDescription("Member to inspect")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("modlogs")
    .setDescription("View moderation records")
    .addUserOption(o =>
      o.setName("member")
        .setDescription("Optional member filter")
    ),

  new SlashCommandBuilder()
    .setName("staff-report")
    .setDescription("Submit a staff conduct report")
    .addUserOption(o =>
      o.setName("staff")
        .setDescription("Staff member being reported")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("details")
        .setDescription("Report details")
        .setRequired(true)
        .setMaxLength(1500)
    ),

  new SlashCommandBuilder()
    .setName("report")
    .setDescription("Submit a community report")
    .addStringOption(o =>
      o.setName("details")
        .setDescription("Report details")
        .setRequired(true)
        .setMaxLength(1500)
    ),

  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Submit a community suggestion")
    .addStringOption(o =>
      o.setName("suggestion")
        .setDescription("Your suggestion")
        .setRequired(true)
        .setMaxLength(1500)
    ),

  new SlashCommandBuilder()
    .setName("feedback")
    .setDescription("Send community feedback")
    .addStringOption(o =>
      o.setName("message")
        .setDescription("Your feedback")
        .setRequired(true)
        .setMaxLength(1500)
    ),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Publish a community announcement")
    .addStringOption(o =>
      o.setName("title")
        .setDescription("Announcement title")
        .setRequired(true)
        .setMaxLength(200)
    )
    .addStringOption(o =>
      o.setName("message")
        .setDescription("Announcement content")
        .setRequired(true)
        .setMaxLength(3500)
    )
].map(command => command.toJSON());

// ==========================================
// SLASH COMMAND REGISTRATION
// ==========================================

async function registerCommands() {
  const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

  const applicationId = process.env.DISCORD_CLIENT_ID.trim();
  const guildId = process.env.DISCORD_GUILD_ID.trim();

  console.log("Registering server slash commands...");

  await rest.put(
    Routes.applicationGuildCommands(
      applicationId,
      guildId
    ),
    { body: commands }
  );

  console.log(
    `Successfully registered ${commands.length} slash commands.`
  );
}

// ==========================================
// SHIFT AND MILITARY TIMERS
// ==========================================

const shiftTimers = new Map();

async function finishShift(id) {
  const shifts = readData("shifts.json", []);
  const index = shifts.findIndex(shift => shift.id === id);

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

  try {
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
  } catch (error) {
    console.error(
      "Could not announce activity end:",
      error.message
    );
  }
}

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

function startActivity(
  type,
  department,
  location,
  hostId,
  duration
) {
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

// ==========================================
// BOT READY EVENT
// ==========================================

client.once("ready", () => {
  console.log(`Online as ${client.user.tag}`);
  console.log(`Connected to ${client.guilds.cache.size} server(s).`);

  for (const shift of readData("shifts.json", [])) {
    if (!shift.ended) {
      scheduleShiftEnd(shift);
    }
  }
});

// ==========================================
// COMMAND HANDLER
// ==========================================

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;

  try {
    if (!interaction.inGuild()) {
      return replySafely(interaction, {
        embeds: [
          makeEmbed("Server only", [
            "This command can only be used inside a server."
          ])
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // --------------------------------------
    // INFORMATION
    // --------------------------------------

    if (command === "information") {
      return interaction.reply({
        embeds: [
          makeEmbed("London, Uxbridge", [
            "**Community information**\nA British Roblox roleplay community based in Uxbridge, West London.",
            "**Roleplay services**\nMetropolitan Police Service, London Fire Brigade, London Ambulance Service, British Transport Police, British Army, civilian services and private businesses.",
            "**Community standards**\nRespect other members, follow staff instructions and keep roleplay organised.",
            "**Disclaimer**\nThis is a fictional Roblox roleplay community and is not affiliated with real government bodies or public services."
          ])
        ]
      });
    }

    // --------------------------------------
    // RULES
    // --------------------------------------

    if (command === "rules") {
      return interaction.reply({
        embeds: [
          makeEmbed("Community rules", [
            "**01 — Respect**\nTreat all members respectfully.",
            "**02 — Staff instructions**\nFollow reasonable moderation instructions.",
            "**03 — Roleplay conduct**\nRandom deathmatching, vehicle deathmatching, fail roleplay, metagaming and powergaming are prohibited.",
            "**04 — Exploiting**\nCheating, exploiting and abusing bugs are prohibited.",
            "**05 — Authority**\nDo not abuse department roles or powers.",
            "**06 — Advertising**\nDo not spam or advertise without permission.",
            "**07 — Impersonation**\nDo not impersonate staff or public-service personnel.",
            "**08 — Operations**\nDo not conduct unauthorised official operations.",
            "**Enforcement**\nViolations may result in warnings, timeouts, removal or bans depending on severity."
          ])
        ]
      });
    }

    // --------------------------------------
    // HELP
    // --------------------------------------

    if (command === "help") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Join Community Relations Office")
          .setStyle(ButtonStyle.Link)
          .setURL(OFFICE_URL)
      );

      return interaction.reply({
        embeds: [
          makeEmbed("Community Relations Office", [
            "Need assistance or want to report a concern?",
            "Join the Community Relations Office to raise complaints, report staff misconduct and contact the moderation team."
          ])
        ],
        components: [row]
      });
    }

    // --------------------------------------
    // PING
    // --------------------------------------

    if (command === "ping") {
      return interaction.reply({
        embeds: [
          makeEmbed("Bot status", [
            `**WebSocket latency**\n${client.ws.ping} ms`
          ])
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // --------------------------------------
    // HOST SHIFT
    // --------------------------------------

    if (command === "host-shift") {
      if (!hasRole(interaction, "SHIFT_HOST_ROLE_ID")) {
        return interaction.reply(denied());
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral
      });

      const department =
        interaction.options.getString("department", true);

      const location =
        interaction.options.getString("location", true);

      const duration =
        interaction.options.getInteger("duration") ?? 60;

      const shift = startActivity(
        "shift",
        department,
        location,
        interaction.user.id,
        duration
      );

      await sendToChannel("staff-shifts", {
        embeds: [
          makeEmbed("Shift now open", [
            `**Department**\n${department}`,
            `**Location**\n${location}`,
            `**Host**\n<@${interaction.user.id}>`,
            `**Duration**\n${duration} minutes`,
            `**Scheduled conclusion**\n<t:${Math.floor(shift.endsAt / 1000)}:F>`
          ])
        ]
      });

      return interaction.editReply({
        embeds: [
          makeEmbed("Shift started", [
            `The shift is scheduled to conclude <t:${Math.floor(shift.endsAt / 1000)}:R>.`
          ])
        ]
      });
    }

    // --------------------------------------
    // MILITARY OPERATION
    // --------------------------------------

    if (command === "military-operation") {
      if (!hasRole(interaction, "MILITARY_HOST_ROLE_ID")) {
        return interaction.reply(denied());
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral
      });

      const operation =
        interaction.options.getString("operation", true);

      const duration =
        interaction.options.getInteger("duration") ?? 60;

      const shift = startActivity(
        "military",
        "British Army",
        operation,
        interaction.user.id,
        duration
      );

      await sendToChannel("staff-shifts", {
        embeds: [
          makeEmbed("Military operation opened", [
            `**Operation**\n${operation}`,
            `**Host**\n<@${interaction.user.id}>`,
            `**Duration**\n${duration} minutes`,
            `**Scheduled conclusion**\n<t:${Math.floor(shift.endsAt / 1000)}:F>`
          ])
        ]
      });

      return interaction.editReply({
        embeds: [
          makeEmbed("Operation scheduled", [
            `The operation is scheduled to conclude <t:${Math.floor(shift.endsAt / 1000)}:R>.`
          ])
        ]
      });
    }

    // --------------------------------------
    // SHIFT STATISTICS
    // --------------------------------------

    if (command === "shift-stats") {
      if (!hasRole(interaction, "SHIFT_HOST_ROLE_ID")) {
        return interaction.reply(denied());
      }

      const shifts = readData("shifts.json", []);

      return interaction.reply({
        embeds: [
          makeEmbed("Shift statistics", [
            `**Total recorded**\n${shifts.length}`,
            `**Active**\n${shifts.filter(s => !s.ended).length}`,
            `**Completed**\n${shifts.filter(s => s.ended).length}`
          ])
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // --------------------------------------
    // TRAINING SESSION
    // --------------------------------------

    if (command === "training-session") {
      if (!canModerate(interaction)) {
        return interaction.reply(denied());
      }

      const department =
        interaction.options.getString("department", true);

      const details =
        interaction.options.getString("details", true);

      await sendToChannel("staff-shifts", {
        embeds: [
          makeEmbed("Training session announced", [
            `**Department**\n${department}`,
            `**Organiser**\n<@${interaction.user.id}>`,
            `**Details**\n${details}`
          ])
        ]
      });

      return interaction.reply({
        embeds: [
          makeEmbed("Training session announced", [
            "The announcement has been published."
          ])
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // --------------------------------------
    // WARN
    // --------------------------------------

    if (command === "warn") {
      if (
        !canModerate(interaction) &&
        !hasRole(interaction, "MODERATOR_IN_TRAINING_ROLE_ID")
      ) {
        return interaction.reply(denied());
      }

      const user =
        interaction.options.getUser("member", true);

      const reason =
        interaction.options.getString("reason", true);

      if (user.id === interaction.user.id || user.bot) {
        return interaction.reply({
          embeds: [
            makeEmbed("Action unsuccessful", [
              "You cannot warn yourself or a bot."
            ])
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      await recordModeration(
        interaction,
        "Warning",
        user,
        reason
      );

      return interaction.reply({
        embeds: [
          makeEmbed("Warning recorded", [
            `**Member**\n${user.tag}`,
            `**Reason**\n${reason}`
          ])
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // --------------------------------------
    // TIMEOUT
    // --------------------------------------

    if (command === "timeout") {
      if (!canModerate(interaction)) {
        return interaction.reply(denied());
      }

      const user =
        interaction.options.getUser("member", true);

      const minutes =
        interaction.options.getInteger("minutes", true);

      const reason =
        interaction.options.getString("reason", true);

      if (
        user.id === interaction.user.id ||
        user.id === client.user.id
      ) {
        return interaction.reply({
          embeds: [
            makeEmbed("Action unsuccessful", [
              "You cannot timeout yourself or the bot."
            ])
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!member) {
        return interaction.reply({
          embeds: [
            makeEmbed("Action unsuccessful", [
              "The member could not be found in this server."
            ])
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!member.moderatable) {
        return interaction.reply({
          embeds: [
            makeEmbed("Action unsuccessful", [
              "The bot cannot timeout this member. Check permissions and role hierarchy."
            ])
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      await member.timeout(minutes * 60000, reason);

      await recordModeration(
        interaction,
        `Timeout (${minutes} minutes)`,
        user,
        reason
      );

      return interaction.reply({
        embeds: [
          makeEmbed("Timeout applied", [
            `**Member**\n${user.tag}`,
            `**Duration**\n${minutes} minutes`,
            `**Reason**\n${reason}`
          ])
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // --------------------------------------
    // KICK AND BAN
    // --------------------------------------

    if (command === "kick" || command === "ban") {
      const allowed = command === "ban"
        ? canSeniorModerate(interaction)
        : canModerate(interaction);

      if (!allowed) {
        return interaction.reply(denied());
      }

      const user =
        interaction.options.getUser("member", true);

      const reason =
        interaction.options.getString("reason", true);

      if (
        user.id === interaction.user.id ||
        user.id === client.user.id
      ) {
        return interaction.reply({
          embeds: [
            makeEmbed("Action unsuccessful", [
              "You cannot target yourself or the bot."
            ])
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!member) {
        return interaction.reply({
          embeds: [
            makeEmbed("Action unsuccessful", [
              "The member could not be found in this server."
            ])
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      if (member.id === interaction.guild.ownerId) {
        return interaction.reply({
          embeds: [
            makeEmbed("Action unsuccessful", [
              "The server owner cannot be moderated by this bot."
            ])
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      if (
        !isAdmin(interaction) &&
        interaction.member.roles.highest.position <=
          member.roles.highest.position
      ) {
        return interaction.reply({
          embeds: [
            makeEmbed("Action unsuccessful", [
              "Your highest role must be above the target member's highest role."
            ])
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      if (command === "kick" && !member.kickable) {
        return interaction.reply({
          embeds: [
            makeEmbed("Action unsuccessful", [
              "The bot cannot kick this member. Check its role hierarchy and permissions."
            ])
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      if (command === "ban" && !member.bannable) {
        return interaction.reply({
          embeds: [
            makeEmbed("Action unsuccessful", [
              "The bot cannot ban this member. Check its role hierarchy and permissions."
            ])
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      if (command === "kick") {
        await member.kick(reason);
      } else {
        await member.ban({ reason });
      }

      await recordModeration(
        interaction,
        command,
        user,
        reason
      );

      return interaction.reply({
        embeds: [
          makeEmbed("Moderation action completed", [
            `**Action**\n${command}`,
            `**Member**\n${user.tag}`,
            `**Reason**\n${reason}`
          ])
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // --------------------------------------
    // PURGE
    // --------------------------------------

    if (command === "purge") {
      if (!canModerate(interaction)) {
        return interaction.reply(denied());
      }

      const amount =
        interaction.options.getInteger("amount", true);

      if (!interaction.channel?.bulkDelete) {
        return interaction.reply({
          embeds: [
            makeEmbed("Purge unsuccessful", [
              "This command cannot be used in this channel."
            ])
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      const deleted =
        await interaction.channel.bulkDelete(amount, true);

      await sendToChannel("mod-logs", {
        embeds: [
          makeEmbed("Moderation record", [
            "**Action**\nPurge",
            `**Moderator**\n${interaction.user.tag}`,
            `**Channel**\n#${interaction.channel.name}`,
            `**Messages deleted**\n${deleted.size}`
          ])
        ]
      }).catch(error => {
        console.error(
          "Purge logging failed:",
          error.message
        );
      });

      return interaction.reply({
        embeds: [
          makeEmbed("Messages deleted", [
            `**Deleted**\n${deleted.size} messages`,
            "Messages older than 14 days cannot be bulk-deleted."
          ])
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // --------------------------------------
    // USER INFORMATION
    // --------------------------------------

    if (command === "userinfo") {
      if (!canModerate(interaction)) {
        return interaction.reply(denied());
      }

      const user =
        interaction.options.getUser("member", true);

      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      return interaction.reply({
        embeds: [
          makeEmbed("Member information", [
            `**Username**\n${user.tag}`,
            `**User ID**\n${user.id}`,
            `**Account created**\n<t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
            `**Joined server**\n${
              member?.joinedTimestamp
                ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
                : "Not available"
            }`
          ])
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // --------------------------------------
    // MODERATION LOGS
    // --------------------------------------

    if (command === "modlogs") {
      if (!canModerate(interaction)) {
        return interaction.reply(denied());
      }

      const user =
        interaction.options.getUser("member");

      const logs = readData("modlogs.json", [])
        .filter(entry => !user || entry.userId === user.id)
        .slice(-8)
        .reverse();

      const sections = logs.length
        ? logs.map(entry => {
            const timestamp = Math.floor(
              new Date(entry.timestamp).getTime() / 1000
            );

            return (
              `**${entry.action}**\n` +
              `**Member**\n${entry.username} (${entry.userId})\n` +
              `**Reason**\n${entry.reason}\n` +
              `**When**\n<t:${timestamp}:R>`
            );
          })
        : ["No matching records were found."];

      return interaction.reply({
        embeds: [
          makeEmbed("Recent moderation records", sections)
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // --------------------------------------
    // STAFF REPORTS AND COMMUNITY REPORTS
    // --------------------------------------

    if (
      command === "staff-report" ||
      command === "report"
    ) {
      const details =
        interaction.options.getString("details", true);

      const staff = command === "staff-report"
        ? interaction.options.getUser("staff", true)
        : null;

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral
      });

      await sendToChannel("reports", {
        embeds: [
          makeEmbed(
            command === "staff-report"
              ? "Staff conduct report"
              : "Community report",
            [
              `**Submitted by**\n<@${interaction.user.id}>`,
              ...(staff
                ? [`**Staff member reported**\n<@${staff.id}>`]
                : []),
              `**Details**\n${details}`
            ]
          )
        ]
      });

      return interaction.editReply({
        embeds: [
          makeEmbed("Report submitted", [
            "Your report has been sent to the review team."
          ])
        ]
      });
    }

    // --------------------------------------
    // SUGGESTIONS AND FEEDBACK
    // --------------------------------------

    if (
      command === "suggest" ||
      command === "feedback"
    ) {
      const isSuggestion = command === "suggest";

      const content = interaction.options.getString(
        isSuggestion ? "suggestion" : "message",
        true
      );

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral
      });

      await sendToChannel(
        isSuggestion ? "suggestions" : "feedback",
        {
          embeds: [
            makeEmbed(
              isSuggestion
                ? "Community suggestion"
                : "Community feedback",
              [
                `**Submitted by**\n<@${interaction.user.id}>`,
                `**Content**\n${content}`
              ]
            )
          ]
        }
      );

      return interaction.editReply({
        embeds: [
          makeEmbed(
            isSuggestion
              ? "Suggestion submitted"
              : "Feedback submitted",
            ["Your message has been sent for review."]
          )
        ]
      });
    }

    // --------------------------------------
    // ANNOUNCEMENTS
    // --------------------------------------

    if (command === "announce") {
      if (!canSeniorModerate(interaction)) {
        return interaction.reply(denied());
      }

      const title =
        interaction.options.getString("title", true);

      const message =
        interaction.options.getString("message", true);

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral
      });

      await sendToChannel("announcements", {
        embeds: [
          makeEmbed(title, [
            message,
            `**Published by**\n${interaction.user.tag}`
          ])
        ]
      });

      return interaction.editReply({
        embeds: [
          makeEmbed("Announcement published", [
            "Your announcement has been sent."
          ])
        ]
      });
    }

  } catch (error) {
    console.error(`Error in /${command}:`, error);

    return replySafely(interaction, {
      embeds: [
        makeEmbed("Command error", [
          "The command could not be completed. Check the bot logs and channel configuration."
        ])
      ],
      flags: MessageFlags.Ephemeral
    }).catch(replyError => {
      console.error(
        "Could not send error response:",
        replyError.message
      );
    });
  }
});

// ==========================================
// STARTUP
// ==========================================

async function main() {
  validateEnvironment();

  console.log("Configuration validated.");
  console.log("Registering slash commands...");

  await registerCommands();

  console.log("Connecting to Discord...");

  await client.login(process.env.DISCORD_TOKEN);
}

main().catch(error => {
  console.error("Bot startup failed:", error);
  process.exit(1);
});
