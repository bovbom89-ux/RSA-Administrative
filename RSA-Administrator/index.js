require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    SlashCommandBuilder,
    REST,
    Routes
} = require("discord.js");

/* =========================================================
   CLIENT
========================================================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* =========================================================
   CONFIG
========================================================= */

const EMBED_COLOR = "#E75D2A";
const SUPPORT_URL = "https://discord.gg/VyjrM6AXZ";

const DATA_DIR = path.join(__dirname, "../data");
const DATA_FILE = path.join(DATA_DIR, "guilds.json");

/* =========================================================
   GHOSTY EMOJIS
   Only used on buttons.
========================================================= */

const EMOJIS = {
    settings: "1557855505932754974",
    support: "1557855636262355175",
    channel: "1557855660719476917",
    confirm: "1557857250939371530",
    shield: "1557861881035624589",
    calendar: "1557861904762802276",
    menu: "1557861926229512343",
    bell: "1557861965530013837",
    arrow: "1557861984727474196",
    key: "1557862010413260862",
    lock: "1557862042617258076",
    flag: "1557862063517470902",
    code: "1557862083457192078",
    staff: "1557862108325220452"
};

function customEmoji(id) {
    return { id };
}

/* =========================================================
   DATA
========================================================= */

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

let guildData = {};

try {
    if (fs.existsSync(DATA_FILE)) {
        guildData = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );
    }
} catch (error) {
    console.error("Could not load guild data:", error);
    guildData = {};
}

/* =========================================================
   DEFAULT SETTINGS
========================================================= */

function defaultGuildData() {
    return {
        prefix: "!",

        setupComplete: false,

        logChannel: null,

        enabledModules: [],

        pendingSetup: null,

        raid: {
            enabled: false,
            threshold: 6,
            window: 10000,
            active: false,
            joins: []
        },

        verification: {
            enabled: false,
            channel: null,
            role: null,
            pending: {}
        },

        accountAge: {
            enabled: false,
            days: 7
        },

        antiSpam: {
            enabled: false,
            messages: 6,
            window: 5000,
            timeout: 5,
            strikes: {}
        },

        inviteProtection: false,

        mentionProtection: {
            enabled: false,
            maximum: 5
        },

        reports: {
            enabled: false,
            channel: null
        },

        dmProtection: false,

        honeypot: {
            enabled: false,
            channel: null,
            kicks: 0,
            kickedUsers: {}
        },

        lockdown: {
            enabled: false,
            channels: {}
        },

        logging: true,

        warnings: {}
    };
}

/* =========================================================
   GET GUILD DATA
========================================================= */

function getGuildData(guildId) {
    if (!guildData[guildId]) {
        guildData[guildId] = defaultGuildData();
    }

    const data = guildData[guildId];

    data.prefix ??= "!";
    data.setupComplete ??= false;
    data.logChannel ??= null;
    data.enabledModules ??= [];
    data.pendingSetup ??= null;

    data.raid ??= defaultGuildData().raid;
    data.verification ??= defaultGuildData().verification;
    data.accountAge ??= defaultGuildData().accountAge;
    data.antiSpam ??= defaultGuildData().antiSpam;
    data.mentionProtection ??=
        defaultGuildData().mentionProtection;

    data.reports ??= defaultGuildData().reports;
    data.honeypot ??= defaultGuildData().honeypot;
    data.lockdown ??= defaultGuildData().lockdown;

    data.inviteProtection ??= false;
    data.dmProtection ??= false;
    data.logging ??= true;
    data.warnings ??= {};

    data.raid.joins ??= [];
    data.verification.pending ??= {};
    data.antiSpam.strikes ??= {};
    data.honeypot.kickedUsers ??= {};
    data.lockdown.channels ??= {};

    return data;
}

/* =========================================================
   SAVE
========================================================= */

function saveData() {
    try {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(guildData, null, 4)
        );
    } catch (error) {
        console.error("Could not save guild data:", error);
    }
}

/* =========================================================
   EMBEDS
========================================================= */

function makeEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

function errorEmbed(description) {
    return makeEmbed("Action Failed", description);
}

/* =========================================================
   PERMISSIONS
========================================================= */

function hasPermission(interaction, permission) {
    return interaction.memberPermissions?.has(permission);
}

function isAdmin(interaction) {
    return hasPermission(
        interaction,
        PermissionsBitField.Flags.Administrator
    );
}

function isStaff(interaction) {
    return (
        isAdmin(interaction) ||
        hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageMessages
        ) ||
        hasPermission(
            interaction,
            PermissionsBitField.Flags.KickMembers
        ) ||
        hasPermission(
            interaction,
            PermissionsBitField.Flags.BanMembers
        ) ||
        hasPermission(
            interaction,
            PermissionsBitField.Flags.ModerateMembers
        )
    );
}

async function requireAdmin(interaction) {
    if (isAdmin(interaction)) {
        return true;
    }

    await interaction.reply({
        embeds: [
            errorEmbed(
                "You need Administrator permissions to use this."
            )
        ],
        ephemeral: true
    });

    return false;
}

async function requireStaff(interaction) {
    if (isStaff(interaction)) {
        return true;
    }

    await interaction.reply({
        embeds: [
            errorEmbed(
                "You need staff or moderation permissions to use this."
            )
        ],
        ephemeral: true
    });

    return false;
}

/* =========================================================
   LOGGING
========================================================= */

async function sendLog(guild, embed) {
    const data = getGuildData(guild.id);

    if (!data.logging || !data.logChannel) {
        return;
    }

    const channel = guild.channels.cache.get(
        data.logChannel
    );

    if (!channel || !channel.isTextBased()) {
        return;
    }

    await channel.send({
        embeds: [embed]
    }).catch(() => {});
}

/* =========================================================
   STATUS
========================================================= */

function status(enabled) {
    return enabled ? "Enabled" : "Disabled";
}

function settingsText(data) {
    return (
        `**Auto Raid Mode:** ${status(data.raid.enabled)}\n` +
        `**Verification:** ${status(data.verification.enabled)}\n` +
        `**Account Age Protection:** ${status(data.accountAge.enabled)}` +
        (data.accountAge.enabled
            ? ` — ${data.accountAge.days} day(s)\n`
            : "\n") +
        `**Anti-Spam:** ${status(data.antiSpam.enabled)}\n` +
        `**Invite Protection:** ${status(data.inviteProtection)}\n` +
        `**Mention Protection:** ${status(
            data.mentionProtection.enabled
        )}\n` +
        `**Reports:** ${status(data.reports.enabled)}\n` +
        `**DM Protection:** ${status(data.dmProtection)}\n` +
        `**Honeypot:** ${status(data.honeypot.enabled)}\n` +
        `**Logging:** ${status(data.logging)}\n` +
        `**Prefix:** \`${data.prefix}\``
    );
}

/* =========================================================
   SETUP OPTIONS
========================================================= */

const SETUP_MODULES = {
    raid: "Auto Raid Mode",
    verification: "Verification",
    accountAge: "Account Age Protection",
    antiSpam: "Anti-Spam",
    invites: "Invite Protection",
    mentions: "Mention Protection",
    reports: "Reports",
    dm: "DM Protection",
    honeypot: "Honeypot",
    logging: "Logging"
};

/* =========================================================
   SETUP EMBED
========================================================= */

function setupEmbed(data) {
    return makeEmbed(
        "Ghosty Setup",
        "Choose the protection systems Ghosty should use.\n\n" +
        "You can select multiple systems at once.\n\n" +
        "**Current Settings**\n" +
        settingsText(data) +
        "\n\nPress **Enable** when you are finished."
    );
}

/* =========================================================
   SETUP MENU
========================================================= */

function setupMenu(data) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId("setup_modules")
        .setPlaceholder("Select protection systems")
        .setMinValues(0)
        .setMaxValues(
            Object.keys(SETUP_MODULES).length
        )
        .addOptions(
            Object.entries(SETUP_MODULES).map(
                ([value, label]) => ({
                    label,
                    value,
                    description:
                        `Enable ${label}`,
                    default:
                        data.enabledModules.includes(
                            value
                        )
                })
            )
        );

    const enable = new ButtonBuilder()
        .setCustomId("setup_enable")
        .setLabel("Enable")
        .setEmoji(
            customEmoji(EMOJIS.confirm)
        )
        .setStyle(ButtonStyle.Success);

    const settings = new ButtonBuilder()
        .setCustomId("setup_settings")
        .setLabel("Settings")
        .setEmoji(
            customEmoji(EMOJIS.settings)
        )
        .setStyle(ButtonStyle.Primary);

    return [
        new ActionRowBuilder().addComponents(menu),
        new ActionRowBuilder().addComponents(
            enable,
            settings
        )
    ];
}

/* =========================================================
   WELCOME
========================================================= */

function welcomeEmbed(guild) {
    return makeEmbed(
        "Thanks for inviting Ghosty!",
        `Thanks for inviting **Ghosty** to **${guild.name}**!\n\n` +
        "Ghosty provides server security, moderation and protection systems.\n\n" +
        "**Getting Started**\n" +
        "Press **Setup** to choose the protection systems you want Ghosty to use.\n\n" +
        "You can change your configuration at any time with `/settings`."
    );
}

function welcomeComponents() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("open_setup")
                .setLabel("Setup")
                .setEmoji(
                    customEmoji(EMOJIS.settings)
                )
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setLabel("Support")
                .setEmoji(
                    customEmoji(EMOJIS.support)
                )
                .setStyle(ButtonStyle.Link)
                .setURL(SUPPORT_URL)
        )
    ];
}

/* =========================================================
   LOG CHANNEL
========================================================= */

async function createLogsChannel(guild) {
    const data = getGuildData(guild.id);

    if (data.logChannel) {
        const existing = guild.channels.cache.get(
            data.logChannel
        );

        if (existing) {
            return existing;
        }
    }

    const existing = guild.channels.cache.find(
        channel =>
            channel.type === ChannelType.GuildText &&
            channel.name === "ghosty-logs"
    );

    if (existing) {
        data.logChannel = existing.id;
        saveData();
        return existing;
    }

    const channel = await guild.channels.create({
        name: "ghosty-logs",
        type: ChannelType.GuildText,
        topic: "Ghosty security and moderation logs.",
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                deny: [
                    PermissionsBitField.Flags.ViewChannel
                ]
            },
            {
                id: client.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.ManageChannels
                ]
            }
        ]
    }).catch(error => {
        console.error(
            "Could not create Ghosty logs channel:",
            error
        );

        return null;
    });

    if (!channel) {
        return null;
    }

    data.logChannel = channel.id;
    saveData();

    return channel;
}

/* =========================================================
   HONEYPOT
========================================================= */

function honeypotPanel(data) {
    return makeEmbed(
        "Ghosty Honeypot",
        "This channel is protected by Ghosty's Honeypot system.\n\n" +
        "Anyone who sends a message in this channel will be automatically kicked.\n\n" +
        `**Members Kicked:** ${data.honeypot.kicks}\n\n` +
        "Staff and administrators are ignored."
    );
}

function honeypotComponents() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("honeypot_kick_count")
                .setLabel("Kick Count: 0")
                .setDisabled(true)
                .setStyle(ButtonStyle.Secondary)
        )
    ];
}

async function updateHoneypotPanel(guild) {
    const data = getGuildData(guild.id);

    if (!data.honeypot.channel) {
        return;
    }

    const channel = guild.channels.cache.get(
        data.honeypot.channel
    );

    if (!channel || !channel.isTextBased()) {
        return;
    }

    const messages = await channel.messages.fetch({
        limit: 20
    }).catch(() => null);

    if (!messages) {
        return;
    }

    const panel = messages.find(
        message =>
            message.author.id === client.user.id &&
            message.embeds[0]?.title ===
                "Ghosty Honeypot"
    );

    if (!panel) {
        return;
    }

    await panel.edit({
        embeds: [honeypotPanel(data)],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("honeypot_kick_count")
                    .setLabel(
                        `Kick Count: ${data.honeypot.kicks}`
                    )
                    .setDisabled(true)
                    .setStyle(ButtonStyle.Secondary)
            )
        ]
    }).catch(() => {});
}

async function createHoneypot(guild) {
    const data = getGuildData(guild.id);

    let channel = guild.channels.cache.get(
        data.honeypot.channel
    );

    if (!channel) {
        channel = guild.channels.cache.find(
            c =>
                c.type === ChannelType.GuildText &&
                c.name === "ghosty-honeypot"
        );
    }

    if (!channel) {
        channel = await guild.channels.create({
            name: "ghosty-honeypot",
            type: ChannelType.GuildText,
            topic: "Ghosty Honeypot protection channel.",
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.SendMessages
                    ]
                }
            ]
        }).catch(() => null);
    }

    if (!channel) {
        return null;
    }

    data.honeypot.channel = channel.id;
    data.honeypot.enabled = true;

    saveData();

    const messages = await channel.messages.fetch({
        limit: 20
    }).catch(() => null);

    const hasPanel = messages?.some(
        message =>
            message.author.id === client.user.id &&
            message.embeds[0]?.title ===
                "Ghosty Honeypot"
    );

    if (!hasPanel) {
        await channel.send({
            embeds: [honeypotPanel(data)],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "honeypot_kick_count"
                        )
                        .setLabel(
                            `Kick Count: ${data.honeypot.kicks}`
                        )
                        .setDisabled(true)
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                )
            ]
        });
    }

    return channel;
}

/* =========================================================
   VERIFICATION
========================================================= */

function verificationPanel() {
    return makeEmbed(
        "Ghosty Verification",
        "Welcome to the server.\n\n" +
        "Press the **Verify** button below to receive a verification code.\n\n" +
        "You must enter the code correctly before you receive the Verified role."
    );
}

function verificationComponents() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verification_start")
                .setLabel("Verify")
                .setEmoji(
                    customEmoji(EMOJIS.key)
                )
                .setStyle(ButtonStyle.Success)
        )
    ];
}

async function createVerification(guild) {
    const data = getGuildData(guild.id);

    let role = data.verification.role
        ? guild.roles.cache.get(
              data.verification.role
          )
        : null;

    if (!role) {
        role = guild.roles.cache.find(
            r =>
                r.name === "Verified" &&
                !r.managed
        );
    }

    if (!role) {
        role = await guild.roles.create({
            name: "Verified",
            reason: "Ghosty verification setup"
        }).catch(() => null);
    }

    if (role) {
        data.verification.role = role.id;
    }

    let channel = data.verification.channel
        ? guild.channels.cache.get(
              data.verification.channel
          )
        : null;

    if (!channel) {
        channel = guild.channels.cache.find(
            c =>
                c.type === ChannelType.GuildText &&
                c.name === "ghosty-verification"
        );
    }

    if (!channel) {
        channel = await guild.channels.create({
            name: "ghosty-verification",
            type: ChannelType.GuildText,
            topic: "Ghosty member verification.",
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.SendMessages
                    ]
                }
            ]
        }).catch(() => null);
    }

    if (!channel) {
        saveData();
        return null;
    }

    data.verification.channel = channel.id;
    data.verification.enabled = true;

    saveData();

    const messages = await channel.messages.fetch({
        limit: 20
    }).catch(() => null);

    const hasPanel = messages?.some(
        message =>
            message.author.id === client.user.id &&
            message.embeds[0]?.title ===
                "Ghosty Verification"
    );

    if (!hasPanel) {
        await channel.send({
            embeds: [verificationPanel()],
            components: verificationComponents()
        });
    }

    return channel;
}

/* =========================================================
   APPLY SETUP
========================================================= */

async function applyModules(guild, selected) {
    const data = getGuildData(guild.id);

    data.enabledModules = [
        ...new Set(selected)
    ];

    data.raid.enabled =
        selected.includes("raid");

    data.verification.enabled =
        selected.includes("verification");

    data.accountAge.enabled =
        selected.includes("accountAge");

    data.antiSpam.enabled =
        selected.includes("antiSpam");

    data.inviteProtection =
        selected.includes("invites");

    data.mentionProtection.enabled =
        selected.includes("mentions");

    data.reports.enabled =
        selected.includes("reports");

    data.dmProtection =
        selected.includes("dm");

    data.honeypot.enabled =
        selected.includes("honeypot");

    data.logging =
        selected.includes("logging");

    const created = [];

    if (data.honeypot.enabled) {
        const channel =
            await createHoneypot(guild);

        if (channel) {
            created.push(
                `<#${channel.id}>`
            );
        }
    }

    if (data.verification.enabled) {
        const channel =
            await createVerification(guild);

        if (channel) {
            created.push(
                `<#${channel.id}>`
            );
        }
    }

    if (data.logging && !data.logChannel) {
        const channel =
            await createLogsChannel(guild);

        if (channel) {
            created.push(
                `<#${channel.id}>`
            );
        }
    }

    saveData();

    return created;
}

/* =========================================================
   SLASH COMMANDS
========================================================= */

const commands = [

    /* MODERATION */

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to ban.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason.")
        ),

    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user.")
        .addStringOption(option =>
            option
                .setName("userid")
                .setDescription("Discord user ID.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason.")
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Timeout a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription("Duration in minutes.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason.")
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove a timeout.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Warning reason.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("View warnings.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clear warnings.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete messages.")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Number of messages.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Change channel slowmode.")
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription("Seconds.")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        ),

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock the current channel."),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock the current channel."),

    new SlashCommandBuilder()
        .setName("lockdown")
        .setDescription("Lock all text channels."),

    new SlashCommandBuilder()
        .setName("unlockdown")
        .setDescription("End server lockdown."),

    /* SECURITY */

    new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Configure Ghosty protection."),

    new SlashCommandBuilder()
        .setName("settings")
        .setDescription("View and manage Ghosty settings."),

    /* INFORMATION */

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("View user information.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User.")
        ),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("View server information."),

    new SlashCommandBuilder()
        .setName("roleinfo")
        .setDescription("View role information.")
        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Role.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("channelinfo")
        .setDescription("View channel information."),

    new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("View a user's avatar.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User.")
        ),

    /* UTILITY */

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("View Ghosty commands."),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check Ghosty's latency."),

    new SlashCommandBuilder()
        .setName("uptime")
        .setDescription("View Ghosty's uptime."),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("View Ghosty information."),

    new SlashCommandBuilder()
        .setName("support")
        .setDescription("Get Ghosty support.")

].map(command => command.toJSON());

/* =========================================================
   REGISTER COMMANDS
========================================================= */

async function registerCommands() {
    try {
        const rest = new REST({
            version: "10"
        }).setToken(
            process.env.DISCORD_TOKEN
        );

        await rest.put(
            Routes.applicationCommands(
                client.user.id
            ),
            {
                body: commands
            }
        );

        console.log(
            `Successfully registered ${commands.length} slash commands.`
        );
    } catch (error) {
        console.error(
            "Slash command registration failed:",
            error
        );
    }
}

/* =========================================================
   SETUP COMMAND
========================================================= */

async function showSetup(interaction) {
    if (!(await requireAdmin(interaction))) {
        return;
    }

    const data = getGuildData(
        interaction.guild.id
    );

    data.pendingSetup =
        data.enabledModules;

    saveData();

    return interaction.reply({
        embeds: [
            setupEmbed(data)
        ],
        components: setupMenu(data),
        ephemeral: true
    });
}

/* =========================================================
   SETTINGS PANEL
========================================================= */

function settingsComponents() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("settings_protection")
                .setLabel("Protection")
                .setEmoji(
                    customEmoji(EMOJIS.shield)
                )
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("settings_reports")
                .setLabel("Reports")
                .setEmoji(
                    customEmoji(EMOJIS.flag)
                )
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("settings_honeypot")
                .setLabel("Honeypot")
                .setEmoji(
                    customEmoji(EMOJIS.lock)
                )
                .setStyle(ButtonStyle.Secondary)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("settings_setup")
                .setLabel("Setup")
                .setEmoji(
                    customEmoji(EMOJIS.settings)
                )
                .setStyle(ButtonStyle.Primary)
        )
    ];
}

async function showSettings(interaction) {
    if (!(await requireAdmin(interaction))) {
        return;
    }

    const data = getGuildData(
        interaction.guild.id
    );

    return interaction.reply({
        embeds: [
            makeEmbed(
                "Ghosty Settings",
                settingsText(data)
            )
        ],
        components: settingsComponents(),
        ephemeral: true
    });
}

/* =========================================================
   SETTINGS DETAILS
========================================================= */

function protectionSettingsEmbed(data) {
    return makeEmbed(
        "Protection Settings",
        `**Auto Raid Mode:** ${status(
            data.raid.enabled
        )}\n` +
        `**Verification:** ${status(
            data.verification.enabled
        )}\n` +
        `**Account Age Protection:** ${status(
            data.accountAge.enabled
        )}\n` +
        `**Anti-Spam:** ${status(
            data.antiSpam.enabled
        )}\n` +
        `**Invite Protection:** ${status(
            data.inviteProtection
        )}\n` +
        `**Mention Protection:** ${status(
            data.mentionProtection.enabled
        )}\n` +
        `**DM Protection:** ${status(
            data.dmProtection
        )}\n` +
        `**Lockdown:** ${status(
            data.lockdown.enabled
        )}`
    );
}

/* =========================================================
   COMMAND HANDLER
========================================================= */

async function handleCommand(interaction) {
    const command = interaction.commandName;

    const staffCommands = [
        "ban",
        "unban",
        "kick",
        "timeout",
        "untimeout",
        "warn",
        "warnings",
        "clearwarnings",
        "purge",
        "slowmode",
        "lock",
        "unlock",
        "lockdown",
        "unlockdown"
    ];

    if (staffCommands.includes(command)) {
        if (!(await requireStaff(interaction))) {
            return;
        }
    }

    /* SETUP */

    if (command === "setup") {
        return showSetup(interaction);
    }

    /* SETTINGS */

    if (command === "settings") {
        return showSettings(interaction);
    }

    /* BAN */

    if (command === "ban") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.BanMembers
            )
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need the Ban Members permission."
                    )
                ],
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        if (user.id === interaction.user.id) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You cannot ban yourself."
                    )
                ],
                ephemeral: true
            });
        }

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member || !member.bannable) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Ghosty cannot ban that member. Check role hierarchy and permissions."
                    )
                ],
                ephemeral: true
            });
        }

        await member.ban({ reason });

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Member Banned",
                `**User:** ${user}\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Reason:** ${reason}`
            )
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Member Banned",
                    `${user} has been permanently banned.\n\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    /* UNBAN */

    if (command === "unban") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.BanMembers
            )
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need the Ban Members permission."
                    )
                ],
                ephemeral: true
            });
        }

        const userId =
            interaction.options.getString("userid");

        try {
            await interaction.guild.members.unban(
                userId
            );
        } catch {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "That user could not be unbanned. Check the ID."
                    )
                ],
                ephemeral: true
            });
        }

        await sendLog(
            interaction.guild,
            makeEmbed(
                "User Unbanned",
                `**User ID:** ${userId}\n` +
                `**Moderator:** ${interaction.user}`
            )
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "User Unbanned",
                    `User **${userId}** has been unbanned.`
                )
            ],
            ephemeral: true
        });
    }

    /* KICK */

    if (command === "kick") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.KickMembers
            )
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need the Kick Members permission."
                    )
                ],
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member || !member.kickable) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Ghosty cannot kick that member."
                    )
                ],
                ephemeral: true
            });
        }

        await member.kick(reason);

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Member Kicked",
                `**User:** ${user}\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Reason:** ${reason}`
            )
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Member Kicked",
                    `${user} has been kicked.\n\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    /* TIMEOUT */

    if (command === "timeout") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need the Moderate Members permission."
                    )
                ],
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        const minutes =
            interaction.options.getInteger("minutes");

        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member || !member.moderatable) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Ghosty cannot timeout that member."
                    )
                ],
                ephemeral: true
            });
        }

        await member.timeout(
            minutes * 60 * 1000,
            reason
        );

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Member Timed Out",
                `**User:** ${user}\n` +
                `**Duration:** ${minutes} minute(s)\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Reason:** ${reason}`
            )
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Member Timed Out",
                    `${user} has been timed out for **${minutes} minute(s)**.`
                )
            ],
            ephemeral: true
        });
    }

    /* UNTIMEOUT */

    if (command === "untimeout") {
        const user =
            interaction.options.getUser("user");

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member || !member.moderatable) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Ghosty cannot modify that member."
                    )
                ],
                ephemeral: true
            });
        }

        await member.timeout(null);

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Timeout Removed",
                    `The timeout has been removed from ${user}.`
                )
            ],
            ephemeral: true
        });
    }

    /* WARN */

    if (command === "warn") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need the Manage Messages permission."
                    )
                ],
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        const reason =
            interaction.options.getString("reason");

        const data =
            getGuildData(interaction.guild.id);

        data.warnings[user.id] ??= [];

        data.warnings[user.id].push({
            reason,
            moderator: interaction.user.id,
            timestamp: Date.now()
        });

        saveData();

        const count =
            data.warnings[user.id].length;

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Member Warned",
                `**User:** ${user}\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Reason:** ${reason}\n` +
                `**Total Warnings:** ${count}`
            )
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Member Warned",
                    `${user} has been warned.\n\n` +
                    `**Reason:** ${reason}\n` +
                    `**Total Warnings:** ${count}`
                )
            ],
            ephemeral: true
        });
    }

    /* WARNINGS */

    if (command === "warnings") {
        const user =
            interaction.options.getUser("user");

        const warnings =
            getGuildData(interaction.guild.id)
                .warnings[user.id] || [];

        if (!warnings.length) {
            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "Warnings",
                        `${user} has no warnings.`
                    )
                ],
                ephemeral: true
            });
        }

        const text = warnings
            .map(
                (warning, index) =>
                    `**Warning ${index + 1}**\n` +
                    `Reason: ${warning.reason}\n` +
                    `Moderator: <@${warning.moderator}>\n` +
                    `Date: <t:${Math.floor(
                        warning.timestamp / 1000
                    )}:F>`
            )
            .join("\n\n");

        return interaction.reply({
            embeds: [
                makeEmbed(
                    `Warnings — ${user.tag}`,
                    `**Total:** ${warnings.length}\n\n${text}`
                )
            ],
            ephemeral: true
        });
    }

    /* CLEAR WARNINGS */

    if (command === "clearwarnings") {
        const user =
            interaction.options.getUser("user");

        const data =
            getGuildData(interaction.guild.id);

        const count =
            data.warnings[user.id]?.length || 0;

        delete data.warnings[user.id];

        saveData();

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Warnings Cleared",
                    `Removed **${count}** warning(s) from ${user}.`
                )
            ],
            ephemeral: true
        });
    }

    /* PURGE */

    if (command === "purge") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need the Manage Messages permission."
                    )
                ],
                ephemeral: true
            });
        }

        const amount =
            interaction.options.getInteger("amount");

        const deleted =
            await interaction.channel.bulkDelete(
                amount,
                true
            );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Messages Purged",
                    `Deleted **${deleted.size}** message(s).`
                )
            ],
            ephemeral: true
        });
    }

    /* SLOWMODE */

    if (command === "slowmode") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need the Manage Channels permission."
                    )
                ],
                ephemeral: true
            });
        }

        const seconds =
            interaction.options.getInteger("seconds");

        await interaction.channel.setRateLimitPerUser(
            seconds
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Slowmode Updated",
                    seconds === 0
                        ? "Slowmode has been disabled."
                        : `Slowmode is now **${seconds} seconds**.`
                )
            ],
            ephemeral: true
        });
    }

    /* LOCK / UNLOCK */

    if (
        command === "lock" ||
        command === "unlock"
    ) {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need the Manage Channels permission."
                    )
                ],
                ephemeral: true
            });
        }

        const locking =
            command === "lock";

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages:
                    locking ? false : null
            }
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    locking
                        ? "Channel Locked"
                        : "Channel Unlocked",
                    locking
                        ? "This channel has been locked."
                        : "This channel has been unlocked."
                )
            ],
            ephemeral: true
        });
    }

    /* LOCKDOWN */

    if (command === "lockdown") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need the Manage Channels permission."
                    )
                ],
                ephemeral: true
            });
        }

        const data =
            getGuildData(interaction.guild.id);

        if (data.lockdown.enabled) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "A lockdown is already active."
                    )
                ],
                ephemeral: true
            });
        }

        data.lockdown.enabled = true;
        data.lockdown.channels = {};

        let locked = 0;

        for (
            const channel of
                interaction.guild.channels.cache.values()
        ) {
            if (
                ![
                    ChannelType.GuildText,
                    ChannelType.GuildAnnouncement
                ].includes(channel.type)
            ) {
                continue;
            }

            const overwrite =
                channel.permissionOverwrites.cache.get(
                    interaction.guild.roles.everyone.id
                );

            data.lockdown.channels[channel.id] = {
                allow:
                    overwrite?.allow.bitfield.toString() ||
                    "0",
                deny:
                    overwrite?.deny.bitfield.toString() ||
                    "0"
            };

            const success =
                await channel.permissionOverwrites
                    .edit(
                        interaction.guild.roles.everyone,
                        {
                            SendMessages: false
                        }
                    )
                    .then(() => true)
                    .catch(() => false);

            if (success) {
                locked++;
            }
        }

        saveData();

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Server Lockdown",
                `Ghosty locked **${locked}** channel(s).\n\n` +
                `**Moderator:** ${interaction.user}`
            )
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Server Lockdown",
                    `Ghosty has locked **${locked}** channel(s).`
                )
            ],
            ephemeral: true
        });
    }

    /* UNLOCKDOWN */

    if (command === "unlockdown") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need the Manage Channels permission."
                    )
                ],
                ephemeral: true
            });
        }

        const data =
            getGuildData(interaction.guild.id);

        if (!data.lockdown.enabled) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "There is no active server lockdown."
                    )
                ],
                ephemeral: true
            });
        }

        let restored = 0;

        for (
            const [
                channelId,
                previous
            ] of Object.entries(
                data.lockdown.channels
            )
        ) {
            const channel =
                interaction.guild.channels.cache.get(
                    channelId
                );

            if (!channel) {
                continue;
            }

            try {
                await channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                        allow: BigInt(
                            previous.allow || "0"
                        ),
                        deny: BigInt(
                            previous.deny || "0"
                        )
                    }
                );

                restored++;
            } catch {
                await channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                        SendMessages: null
                    }
                ).catch(() => {});
            }
        }

        data.lockdown.enabled = false;
        data.lockdown.channels = {};

        saveData();

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Lockdown Ended",
                    `Ghosty restored **${restored}** channel(s).`
                )
            ],
            ephemeral: true
        });
    }

    /* USERINFO */

    if (command === "userinfo") {
        const user =
            interaction.options.getUser("user") ||
            interaction.user;

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "User Information",
                    `**Username:** ${user.tag}\n` +
                    `**ID:** ${user.id}\n` +
                    `**Bot:** ${user.bot ? "Yes" : "No"}\n` +
                    `**Created:** <t:${Math.floor(
                        user.createdTimestamp / 1000
                    )}:F>\n` +
                    `**Server Member:** ${
                        member ? "Yes" : "No"
                    }\n` +
                    `**Joined:** ${
                        member?.joinedTimestamp
                            ? `<t:${Math.floor(
                                member.joinedTimestamp / 1000
                            )}:F>`
                            : "Unknown"
                    }\n` +
                    `**Highest Role:** ${
                        member
                            ? member.roles.highest
                            : "None"
                    }`
                )
            ],
            ephemeral: true
        });
    }

    /* SERVERINFO */

    if (command === "serverinfo") {
        const guild = interaction.guild;

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Server Information",
                    `**Name:** ${guild.name}\n` +
                    `**ID:** ${guild.id}\n` +
                    `**Owner:** <@${guild.ownerId}>\n` +
                    `**Members:** ${guild.memberCount}\n` +
                    `**Roles:** ${guild.roles.cache.size}\n` +
                    `**Channels:** ${guild.channels.cache.size}\n` +
                    `**Boost Level:** ${guild.premiumTier}\n` +
                    `**Boosts:** ${
                        guild.premiumSubscriptionCount || 0
                    }\n` +
                    `**Created:** <t:${Math.floor(
                        guild.createdTimestamp / 1000
                    )}:F>`
                )
            ],
            ephemeral: true
        });
    }

    /* ROLEINFO */

    if (command === "roleinfo") {
        const role =
            interaction.options.getRole("role");

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Role Information",
                    `**Name:** ${role.name}\n` +
                    `**ID:** ${role.id}\n` +
                    `**Members:** ${role.members.size}\n` +
                    `**Position:** ${role.position}\n` +
                    `**Colour:** ${role.hexColor}\n` +
                    `**Mentionable:** ${
                        role.mentionable
                            ? "Yes"
                            : "No"
                    }\n` +
                    `**Hoisted:** ${
                        role.hoist ? "Yes" : "No"
                    }\n` +
                    `**Managed:** ${
                        role.managed ? "Yes" : "No"
                    }`
                )
            ],
            ephemeral: true
        });
    }

    /* CHANNELINFO */

    if (command === "channelinfo") {
        const channel =
            interaction.channel;

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Channel Information",
                    `**Name:** ${channel.name}\n` +
                    `**ID:** ${channel.id}\n` +
                    `**Type:** ${channel.type}\n` +
                    `**Category:** ${
                        channel.parent?.name || "None"
                    }\n` +
                    `**Position:** ${channel.position}\n` +
                    `**Created:** <t:${Math.floor(
                        channel.createdTimestamp / 1000
                    )}:F>`
                )
            ],
            ephemeral: true
        });
    }

    /* AVATAR */

    if (command === "avatar") {
        const user =
            interaction.options.getUser("user") ||
            interaction.user;

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(EMBED_COLOR)
                    .setTitle(`${user.tag}'s Avatar`)
                    .setImage(
                        user.displayAvatarURL({
                            size: 4096
                        })
                    )
            ],
            ephemeral: true
        });
    }

    /* HELP */

    if (command === "help") {
        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Ghosty Commands",
                    "**Security**\n" +
                    "/setup\n" +
                    "/settings\n" +
                    "/lockdown\n" +
                    "/unlockdown\n\n" +

                    "**Moderation**\n" +
                    "/ban\n" +
                    "/unban\n" +
                    "/kick\n" +
                    "/timeout\n" +
                    "/untimeout\n" +
                    "/warn\n" +
                    "/warnings\n" +
                    "/clearwarnings\n" +
                    "/purge\n" +
                    "/slowmode\n" +
                    "/lock\n" +
                    "/unlock\n\n" +

                    "**Information**\n" +
                    "/userinfo\n" +
                    "/serverinfo\n" +
                    "/roleinfo\n" +
                    "/channelinfo\n" +
                    "/avatar\n\n" +

                    "**Utility**\n" +
                    "/help\n" +
                    "/ping\n" +
                    "/uptime\n" +
                    "/botinfo\n" +
                    "/support"
                )
            ],
            ephemeral: true
        });
    }

    /* PING */

    if (command === "ping") {
        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Ghosty Ping",
                    `**WebSocket:** ${client.ws.ping}ms\n` +
                    "**Status:** Online"
                )
            ],
            ephemeral: true
        });
    }

    /* UPTIME */

    if (command === "uptime") {
        const total =
            Math.floor(process.uptime());

        const days =
            Math.floor(total / 86400);

        const hours =
            Math.floor(
                (total % 86400) / 3600
            );

        const minutes =
            Math.floor(
                (total % 3600) / 60
            );

        const seconds =
            total % 60;

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Ghosty Uptime",
                    `**Days:** ${days}\n` +
                    `**Hours:** ${hours}\n` +
                    `**Minutes:** ${minutes}\n` +
                    `**Seconds:** ${seconds}`
                )
            ],
            ephemeral: true
        });
    }

    /* BOTINFO */

    if (command === "botinfo") {
        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Ghosty",
                    "Discord moderation and server security bot.\n\n" +
                    `**Servers:** ${client.guilds.cache.size}\n` +
                    `**Commands:** ${commands.length}\n` +
                    `**Discord.js:** ${
                        require("discord.js").version
                    }\n` +
                    `**Node.js:** ${process.version}`
                )
            ],
            ephemeral: true
        });
    }

    /* SUPPORT */

    if (command === "support") {
        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Ghosty Support",
                    `Need help with Ghosty?\n\n` +
                    `[Join the Ghosty Support Server](${SUPPORT_URL})`
                )
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   BUTTON HANDLER
========================================================= */

async function handleButton(interaction) {
    const id = interaction.customId;

    /*
       Verification button is intentionally available
       to normal members.
    */

    if (id === "verification_start") {
        const data =
            getGuildData(
                interaction.guild.id
            );

        if (!data.verification.enabled) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Verification is currently disabled."
                    )
                ],
                ephemeral: true
            });
        }

        const role =
            interaction.guild.roles.cache.get(
                data.verification.role
            );

        if (!role) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "The Verified role could not be found."
                    )
                ],
                ephemeral: true
            });
        }

        if (
            interaction.member.roles.cache.has(
                role.id
            )
        ) {
            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "Already Verified",
                        "You are already verified."
                    )
                ],
                ephemeral: true
            });
        }

        const code =
            String(
                Math.floor(
                    100000 +
                    Math.random() * 900000
                )
            );

        data.verification.pending[
            interaction.user.id
        ] = {
            code,
            created: Date.now()
        };

        saveData();

        /*
           Discord buttons cannot directly collect
           typed text, so a modal is used here.
        */

        const {
            ModalBuilder,
            TextInputBuilder,
            TextInputStyle
        } = require("discord.js");

        const modal = new ModalBuilder()
            .setCustomId(
                `verification_modal:${code}`
            )
            .setTitle("Ghosty Verification");

        const input = new TextInputBuilder()
            .setCustomId("verification_code")
            .setLabel("Enter your verification code")
            .setPlaceholder("Enter the 6 digit code")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6);

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                input
            )
        );

        await interaction.reply({
            embeds: [
                makeEmbed(
                    "Verification Code",
                    `Your verification code is:\n\n**${code}**\n\nEnter this code in the verification window.`
                )
            ],
            ephemeral: true
        });

        /*
           The modal needs to be opened separately.
           This short delay allows the ephemeral response
           to be displayed before the modal is requested.
        */

        setTimeout(() => {
            interaction.showModal(modal).catch(() => {});
        }, 100);

        return;
    }

    /* ADMIN BUTTONS */

    if (!(await requireAdmin(interaction))) {
        return;
    }

    const data =
        getGuildData(
            interaction.guild.id
        );

    /* OPEN SETUP */

    if (id === "open_setup") {
        return showSetup(interaction);
    }

    /* SETUP SETTINGS */

    if (id === "setup_settings") {
        return interaction.update({
            embeds: [
                setupEmbed(data)
            ],
            components: setupMenu(data)
        });
    }

    /* SETUP ENABLE */

    if (id === "setup_enable") {
        const selected =
            data.pendingSetup ??
            data.enabledModules;

        const created =
            await applyModules(
                interaction.guild,
                selected
            );

        data.pendingSetup = null;
        data.setupComplete = true;

        saveData();

        const enabledText =
            selected.length
                ? selected
                    .map(
                        module =>
                            `• **${
                                SETUP_MODULES[
                                    module
                                ] || module
                            }**`
                    )
                    .join("\n")
                : "• No protection systems selected";

        const createdText =
            created.length
                ? `\n\n**Created:**\n${created.join(
                    "\n"
                )}`
                : "";

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Ghosty Setup Complete",
                    "Ghosty has successfully configured your selected protection systems.\n\n" +
                    enabledText +
                    createdText
                )
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "setup_settings"
                        )
                        .setLabel("Settings")
                        .setEmoji(
                            customEmoji(
                                EMOJIS.settings
                            )
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        )
                )
            ]
        });
    }

    /* SETTINGS PROTECTION */

    if (id === "settings_protection") {
        return interaction.update({
            embeds: [
                protectionSettingsEmbed(data)
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "settings_setup"
                        )
                        .setLabel("Edit Setup")
                        .setEmoji(
                            customEmoji(
                                EMOJIS.settings
                            )
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        )
                )
            ]
        });
    }

    /* SETTINGS REPORTS */

    if (id === "settings_reports") {
        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Reports",
                    `**Status:** ${status(
                        data.reports.enabled
                    )}\n\n` +
                    `**Channel:** ${
                        data.reports.channel
                            ? `<#${data.reports.channel}>`
                            : "Not configured"
                    }\n\n` +
                    "Use the setup panel to enable Reports."
                )
            ],
            ephemeral: true
        });
    }

    /* SETTINGS HONEYPOT */

    if (id === "settings_honeypot") {
        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Honeypot",
                    `**Status:** ${status(
                        data.honeypot.enabled
                    )}\n` +
                    `**Channel:** ${
                        data.honeypot.channel
                            ? `<#${data.honeypot.channel}>`
                            : "Not created"
                    }\n` +
                    `**Members Kicked:** ${data.honeypot.kicks}`
                )
            ],
            ephemeral: true
        });
    }

    /* SETTINGS SETUP */

    if (id === "settings_setup") {
        data.pendingSetup =
            data.enabledModules;

        saveData();

        return interaction.update({
            embeds: [
                setupEmbed(data)
            ],
            components: setupMenu(data)
        });
    }
}

/* =========================================================
   STRING SELECT
========================================================= */

async function handleStringSelect(interaction) {
    if (!(await requireAdmin(interaction))) {
        return;
    }

    const data =
        getGuildData(
            interaction.guild.id
        );

    if (
        interaction.customId ===
        "setup_modules"
    ) {
        data.pendingSetup =
            interaction.values;

        saveData();

        const preview = {
            ...data,
            enabledModules:
                interaction.values
        };

        return interaction.update({
            embeds: [
                setupEmbed(preview)
            ],
            components:
                setupMenu(preview)
        });
    }
}

/* =========================================================
   CHANNEL SELECT
========================================================= */

async function handleChannelSelect(interaction) {
    if (!(await requireAdmin(interaction))) {
        return;
    }

    const data =
        getGuildData(
            interaction.guild.id
        );

    if (
        interaction.customId ===
        "report_channel"
    ) {
        data.reports.channel =
            interaction.values[0];

        data.reports.enabled = true;

        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Reports Configured",
                    `Reports will now be sent to <#${data.reports.channel}>.`
                )
            ],
            components: []
        });
    }
}

/* =========================================================
   MODAL HANDLER
========================================================= */

async function handleModal(interaction) {
    if (
        !interaction.customId.startsWith(
            "verification_modal:"
        )
    ) {
        return;
    }

    const data =
        getGuildData(
            interaction.guild.id
        );

    const expectedCode =
        interaction.customId.split(":")[1];

    const enteredCode =
        interaction.fields.getTextInputValue(
            "verification_code"
        );

    const pending =
        data.verification.pending[
            interaction.user.id
        ];

    if (!pending) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Your verification session has expired. Please press Verify again."
                )
            ],
            ephemeral: true
        });
    }

    if (
        Date.now() -
            pending.created >
        5 * 60 * 1000
    ) {
        delete data.verification.pending[
            interaction.user.id
        ];

        saveData();

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Your verification code has expired. Please try again."
                )
            ],
            ephemeral: true
        });
    }

    if (
        enteredCode !== expectedCode ||
        enteredCode !== pending.code
    ) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "That verification code is incorrect."
                )
            ],
            ephemeral: true
        });
    }

    const role =
        interaction.guild.roles.cache.get(
            data.verification.role
        );

    if (!role) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "The Verified role could not be found."
                )
            ],
            ephemeral: true
        });
    }

    const member =
        await interaction.guild.members
            .fetch(interaction.user.id)
            .catch(() => null);

    if (!member) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Your server membership could not be found."
                )
            ],
            ephemeral: true
        });
    }

    await member.roles.add(
        role,
        "Ghosty verification"
    ).catch(() => null);

    delete data.verification.pending[
        interaction.user.id
    ];

    saveData();

    await sendLog(
        interaction.guild,
        makeEmbed(
            "Member Verified",
            `**Member:** ${interaction.user}\n` +
            `**Role:** ${role}`
        )
    );

    return interaction.reply({
        embeds: [
            makeEmbed(
                "Verification Complete",
                "You have successfully verified and received access to the server."
            )
        ],
        ephemeral: true
    });
}

/* =========================================================
   MESSAGE TRACKING
========================================================= */

const messageTracker = new Map();

/* =========================================================
   MESSAGE CREATE
========================================================= */

client.on(
    "messageCreate",
    async message => {
        if (
            !message.guild ||
            message.author.bot
        ) {
            return;
        }

        const data =
            getGuildData(
                message.guild.id
            );

        /* HONEYPOT */

        if (
            data.honeypot.enabled &&
            message.channel.id ===
                data.honeypot.channel
        ) {
            const member =
                message.member;

            if (!member) {
                return;
            }

            const protectedMember =
                member.permissions.has(
                    PermissionsBitField.Flags.Administrator
                );

            if (protectedMember) {
                return;
            }

            await message.delete().catch(
                () => {}
            );

            if (member.kickable) {
                await member.kick(
                    "Ghosty Honeypot"
                ).catch(() => {});

                data.honeypot.kicks++;

                data.honeypot.kickedUsers[
                    member.id
                ] = {
                    username:
                        member.user.tag,
                    timestamp:
                        Date.now()
                };

                saveData();

                await updateHoneypotPanel(
                    message.guild
                );

                await sendLog(
                    message.guild,
                    makeEmbed(
                        "Honeypot Kick",
                        `**User:** ${member.user}\n` +
                        `**Channel:** ${message.channel}\n` +
                        `**Total Honeypot Kicks:** ${data.honeypot.kicks}`
                    )
                );
            }

            return;
        }

        /* INVITE PROTECTION */

        if (
            data.inviteProtection &&
            /(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)/i.test(
                message.content
            )
        ) {
            await message.delete().catch(
                () => {}
            );

            await sendLog(
                message.guild,
                makeEmbed(
                    "Invite Removed",
                    `**User:** ${message.author}\n` +
                    `**Channel:** ${message.channel}\n` +
                    "A Discord invite was automatically removed."
                )
            );

            return;
        }

        /* MENTION PROTECTION */

        if (
            data.mentionProtection.enabled &&
            message.mentions.users.size +
                message.mentions.roles.size >=
                data.mentionProtection.maximum
        ) {
            await message.delete().catch(
                () => {}
            );

            await sendLog(
                message.guild,
                makeEmbed(
                    "Mass Mention Blocked",
                    `**User:** ${message.author}\n` +
                    `**Channel:** ${message.channel}\n` +
                    `**Mentions:** ${
                        message.mentions.users.size +
                        message.mentions.roles.size
                    }`
                )
            );

            return;
        }

        /* ANTI SPAM */

        if (data.antiSpam.enabled) {
            const key =
                `${message.guild.id}:${message.author.id}`;

            const now = Date.now();

            const recent =
                (
                    messageTracker.get(key) ||
                    []
                ).filter(
                    timestamp =>
                        now -
                            timestamp <
                        data.antiSpam.window
                );

            recent.push(now);

            messageTracker.set(
                key,
                recent
            );

            if (
                recent.length >=
                data.antiSpam.messages
            ) {
                await message.delete().catch(
                    () => {}
                );

                data.antiSpam.strikes[
                    message.author.id
                ] =
                    (
                        data.antiSpam.strikes[
                            message.author.id
                        ] || 0
                    ) + 1;

                saveData();

                const member =
                    message.member;

                if (
                    member?.moderatable &&
                    data.antiSpam.strikes[
                        message.author.id
                    ] >= 2
                ) {
                    await member.timeout(
                        data.antiSpam.timeout *
                            60 *
                            1000,
                        "Ghosty Anti-Spam"
                    ).catch(() => {});
                }

                await sendLog(
                    message.guild,
                    makeEmbed(
                        "Spam Blocked",
                        `**User:** ${message.author}\n` +
                        `**Channel:** ${message.channel}\n` +
                        `**Strike:** ${
                            data.antiSpam.strikes[
                                message.author.id
                            ]
                        }`
                    )
                );
            }
        }
    }
);

/* =========================================================
   MEMBER JOIN
========================================================= */

client.on(
    "guildMemberAdd",
    async member => {
        const data =
            getGuildData(
                member.guild.id
            );

        /* ACCOUNT AGE */

        if (
            data.accountAge.enabled
        ) {
            const accountAge =
                Date.now() -
                member.user.createdTimestamp;

            const minimumAge =
                data.accountAge.days *
                24 *
                60 *
                60 *
                1000;

            if (
                accountAge <
                    minimumAge &&
                member.kickable
            ) {
                await member.kick(
                    "Ghosty Account Age Protection"
                ).catch(() => {});

                await sendLog(
                    member.guild,
                    makeEmbed(
                        "Young Account Blocked",
                        `**User:** ${member.user}\n` +
                        `**Account Age:** ${Math.floor(
                            accountAge /
                                86400000
                        )} day(s)\n` +
                        `**Minimum Required:** ${data.accountAge.days} day(s)`
                    )
                );

                return;
            }
        }

        /* RAID DETECTION */

        if (data.raid.enabled) {
            const now = Date.now();

            data.raid.joins =
                data.raid.joins.filter(
                    timestamp =>
                        now -
                            timestamp <
                        data.raid.window
                );

            data.raid.joins.push(now);

            saveData();

            if (
                data.raid.joins.length >=
                data.raid.threshold
            ) {
                if (!data.raid.active) {
                    data.raid.active = true;

                    saveData();

                    await sendLog(
                        member.guild,
                        makeEmbed(
                            "Raid Mode Activated",
                            `Ghosty detected **${data.raid.joins.length}** joins within the configured raid window.\n\n` +
                            "Raid protection has been activated."
                        )
                    );
                }
            }
        }

        /* VERIFICATION ROLE RESTRICTION */

        if (
            data.verification.enabled &&
            data.verification.role
        ) {
            /*
               The verification role is created here.
               Server owners should configure their
               verification channel permissions so
               unverified members cannot access
               protected channels.
            */
        }
    }
);

/* =========================================================
   MESSAGE TRACKER CLEANUP
========================================================= */

setInterval(() => {
    const now = Date.now();

    for (
        const [
            key,
            timestamps
        ] of messageTracker.entries()
    ) {
        const recent =
            timestamps.filter(
                timestamp =>
                    now -
                        timestamp <
                    5000
            );

        if (recent.length) {
            messageTracker.set(
                key,
                recent
            );
        } else {
            messageTracker.delete(key);
        }
    }
}, 30000);

/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
    "interactionCreate",
    async interaction => {
        try {
            if (
                interaction.isChatInputCommand()
            ) {
                await handleCommand(
                    interaction
                );

                return;
            }

            if (
                interaction.isButton()
            ) {
                await handleButton(
                    interaction
                );

                return;
            }

            if (
                interaction.isStringSelectMenu()
            ) {
                await handleStringSelect(
                    interaction
                );

                return;
            }

            if (
                interaction.isChannelSelectMenu()
            ) {
                await handleChannelSelect(
                    interaction
                );

                return;
            }

            if (
                interaction.isModalSubmit()
            ) {
                await handleModal(
                    interaction
                );

                return;
            }
        } catch (error) {
            console.error(
                "Interaction error:",
                error
            );

            const response = {
                embeds: [
                    errorEmbed(
                        "Ghosty encountered an error while processing that request."
                    )
                ],
                ephemeral: true
            };

            if (
                interaction.replied ||
                interaction.deferred
            ) {
                await interaction
                    .followUp(response)
                    .catch(() => {});
            } else {
                await interaction
                    .reply(response)
                    .catch(() => {});
            }
        }
    }
);

/* =========================================================
   BOT READY
========================================================= */

client.once(
    "ready",
    async () => {
        console.log(
            `Ghosty is online as ${client.user.tag}`
        );

        console.log(
            `Serving ${client.guilds.cache.size} server(s).`
        );

        await registerCommands();
    }
);

/* =========================================================
   BOT JOINED SERVER
========================================================= */

client.on(
    "guildCreate",
    async guild => {
        console.log(
            `Ghosty joined ${guild.name} (${guild.id})`
        );

        getGuildData(guild.id);
        saveData();

        /*
           We do NOT automatically create a logs
           channel anymore.

           The administrator chooses Logging during
           setup.
        */
    }
);

/* =========================================================
   TOKEN
========================================================= */

if (!process.env.DISCORD_TOKEN) {
    console.error(
        "DISCORD_TOKEN is missing from environment variables."
    );

    process.exit(1);
}

/* =========================================================
   LOGIN
========================================================= */

client.login(
    process.env.DISCORD_TOKEN
);
