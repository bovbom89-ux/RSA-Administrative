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
    ChannelType,
    SlashCommandBuilder,
    REST,
    Routes,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
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
   GHOSTY CUSTOM EMOJIS
   ONLY USED ON BUTTONS
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
   PROTECTION MODULES
========================================================= */

const MODULES = {
    antiraid: "Anti-Raid",
    raidmode: "Raid Mode",
    automod: "AutoMod",
    honeypot: "Honeypot",
    verification: "Verification",
    invites: "Invite Protection",
    spam: "Spam Protection",
    mentions: "Mention Protection",
    caps: "Caps Protection",
    lockdown: "Automatic Lockdown",
    joinprotection: "Join Protection",
    dmprotection: "DM Protection",
    warnings: "Warning System",
    moderation: "Moderation"
};

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
   SAVE DATA
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
   DEFAULT DATA
========================================================= */

function defaultGuildData() {
    return {
        enabledModules: [],
        pendingSetup: null,

        honeypot: {
            enabled: false,
            channel: null,
            kickCount: 0,
            violations: {}
        },

        verification: {
            enabled: false,
            channel: null,
            role: null,
            pending: {}
        },

        automod: {
            enabled: false,
            spam: true,
            mentions: true,
            invites: true,
            caps: false
        },

        antiraid: {
            enabled: false,
            joins: [],
            threshold: 6,
            window: 10000
        },

        raidmode: false,

        joinprotection: false,

        dmprotection: false,

        warnings: {},

        lockdown: {
            enabled: false,
            channels: {}
        }
    };
}

/* =========================================================
   GET DATA
========================================================= */

function getGuildData(guildId) {
    if (!guildData[guildId]) {
        guildData[guildId] = defaultGuildData();
    }

    const data = guildData[guildId];

    data.enabledModules ??= [];
    data.pendingSetup ??= null;

    data.honeypot ??= defaultGuildData().honeypot;
    data.verification ??= defaultGuildData().verification;
    data.automod ??= defaultGuildData().automod;
    data.antiraid ??= defaultGuildData().antiraid;
    data.lockdown ??= defaultGuildData().lockdown;
    data.warnings ??= {};

    data.honeypot.kickCount ??= 0;
    data.honeypot.violations ??= {};

    data.verification.pending ??= {};

    return data;
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
   MODULE TEXT
========================================================= */

function enabledModuleText(data) {
    if (!data.enabledModules.length) {
        return "None";
    }

    return data.enabledModules
        .map(
            module =>
                `• **${MODULES[module] || module}**`
        )
        .join("\n");
}

/* =========================================================
   SETUP EMBED
========================================================= */

function setupEmbed(data) {
    return makeEmbed(
        "Ghosty Setup",
        "Select the protection systems you want Ghosty to use.\n\n" +
        "Multiple protection systems can be enabled at the same time.\n\n" +
        `**Currently enabled:**\n${enabledModuleText(data)}`
    );
}

/* =========================================================
   SETUP MENU
========================================================= */

function setupMenu(data) {
    const emojiMap = {
        antiraid: EMOJIS.shield,
        raidmode: EMOJIS.flag,
        automod: EMOJIS.menu,
        honeypot: EMOJIS.lock,
        verification: EMOJIS.key,
        invites: EMOJIS.arrow,
        spam: EMOJIS.bell,
        mentions: EMOJIS.bell,
        caps: EMOJIS.menu,
        lockdown: EMOJIS.lock,
        joinprotection: EMOJIS.shield,
        dmprotection: EMOJIS.support,
        warnings: EMOJIS.flag,
        moderation: EMOJIS.staff
    };

    const menu = new StringSelectMenuBuilder()
        .setCustomId("setup_modules")
        .setPlaceholder("Select protection modules")
        .setMinValues(0)
        .setMaxValues(Object.keys(MODULES).length)
        .addOptions(
            Object.entries(MODULES).map(
                ([value, label]) => ({
                    label,
                    value,
                    description: `Enable ${label}`,
                    default:
                        data.enabledModules.includes(value),
                    emoji: customEmoji(
                        emojiMap[value] || EMOJIS.shield
                    )
                })
            )
        );

    const enable = new ButtonBuilder()
        .setCustomId("setup_enable")
        .setLabel("Enable")
        .setEmoji(customEmoji(EMOJIS.confirm))
        .setStyle(ButtonStyle.Success);

    const back = new ButtonBuilder()
        .setCustomId("setup_back")
        .setLabel("Back")
        .setEmoji(customEmoji(EMOJIS.arrow))
        .setStyle(ButtonStyle.Secondary);

    return [
        new ActionRowBuilder().addComponents(menu),
        new ActionRowBuilder().addComponents(enable, back)
    ];
}

/* =========================================================
   WELCOME
========================================================= */

function welcomeComponents() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("open_setup")
                .setLabel("Setup")
                .setEmoji(customEmoji(EMOJIS.settings))
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setLabel("Support")
                .setEmoji(customEmoji(EMOJIS.support))
                .setStyle(ButtonStyle.Link)
                .setURL(SUPPORT_URL)
        )
    ];
}

function welcomeEmbed(guild) {
    return makeEmbed(
        "Thanks for inviting Ghosty!",
        `Thanks for inviting **Ghosty** to **${guild.name}**!\n\n` +
        "Ghosty provides moderation, security and server protection systems designed to help keep your server safe.\n\n" +
        "**Getting Started**\n" +
        "Press the **Setup** button below to configure Ghosty.\n\n" +
        "You can enable multiple protection systems and return to setup whenever you need to change them."
    );
}

/* =========================================================
   CREATE HONEYPOT CHANNEL
========================================================= */

async function createHoneypotChannel(guild) {
    const existing = guild.channels.cache.find(
        channel =>
            channel.type === ChannelType.GuildText &&
            channel.name === "ghosty-honeypot"
    );

    if (existing) {
        return existing;
    }

    return guild.channels.create({
        name: "ghosty-honeypot",
        type: ChannelType.GuildText,
        topic: "Ghosty Honeypot protection channel.",
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            }
        ]
    }).catch(error => {
        console.error(
            "Could not create Honeypot channel:",
            error
        );

        return null;
    });
}

/* =========================================================
   HONEYPOT PANEL
========================================================= */

function honeypotPanel(data) {
    return makeEmbed(
        "Ghosty Honeypot",
        "This channel is protected by Ghosty's Honeypot system.\n\n" +
        "Do not send messages in this channel.\n\n" +
        `**Members Kicked:** ${data.honeypot.kickCount}\n\n` +
        "Any member who sends a message here will be removed from the server."
    );
}

/* =========================================================
   HONEYPOT BUTTON
   GREY + DISABLED
========================================================= */

function honeypotComponents(data) {
    const counter = new ButtonBuilder()
        .setCustomId("honeypot_counter")
        .setLabel(
            `Kicks: ${data.honeypot.kickCount}`
        )
        .setEmoji(customEmoji(EMOJIS.lock))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    return [
        new ActionRowBuilder().addComponents(counter)
    ];
}

/* =========================================================
   POST HONEYPOT
========================================================= */

async function postHoneypotPanel(guild, channel) {
    const data = getGuildData(guild.id);

    data.honeypot.channel = channel.id;
    data.honeypot.enabled = true;

    saveData();

    const recent = await channel.messages.fetch({
        limit: 20
    }).catch(() => null);

    const existing = recent?.find(
        message =>
            message.author.id === client.user.id &&
            message.embeds[0]?.title ===
                "Ghosty Honeypot"
    );

    if (existing) {
        await existing.edit({
            embeds: [honeypotPanel(data)],
            components: honeypotComponents(data)
        }).catch(() => {});

        return;
    }

    await channel.send({
        embeds: [honeypotPanel(data)],
        components: honeypotComponents(data)
    });
}

/* =========================================================
   CREATE VERIFICATION CHANNEL
========================================================= */

async function createVerificationChannel(guild) {
    const existing = guild.channels.cache.find(
        channel =>
            channel.type === ChannelType.GuildText &&
            channel.name === "ghosty-verification"
    );

    if (existing) {
        return existing;
    }

    return guild.channels.create({
        name: "ghosty-verification",
        type: ChannelType.GuildText,
        topic: "Ghosty verification channel.",
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory
                ],
                deny: [
                    PermissionsBitField.Flags.SendMessages
                ]
            }
        ]
    }).catch(error => {
        console.error(
            "Could not create verification channel:",
            error
        );

        return null;
    });
}

/* =========================================================
   VERIFICATION PANEL
========================================================= */

function verificationPanel() {
    return makeEmbed(
        "Ghosty Verification",
        "Verify your account to gain access to the server.\n\n" +
        "Press the button below to receive a verification code.\n\n" +
        "You will then be asked to enter the code to complete verification."
    );
}

function verificationComponents() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verification_start")
                .setLabel("Verify")
                .setEmoji(customEmoji(EMOJIS.key))
                .setStyle(ButtonStyle.Success)
        )
    ];
}

/* =========================================================
   POST VERIFICATION
========================================================= */

async function postVerificationPanel(guild, channel) {
    const data = getGuildData(guild.id);

    data.verification.channel = channel.id;
    data.verification.enabled = true;

    saveData();

    const recent = await channel.messages.fetch({
        limit: 20
    }).catch(() => null);

    const existing = recent?.find(
        message =>
            message.author.id === client.user.id &&
            message.embeds[0]?.title ===
                "Ghosty Verification"
    );

    if (existing) {
        return;
    }

    await channel.send({
        embeds: [verificationPanel()],
        components: verificationComponents()
    });
}

/* =========================================================
   APPLY MODULES
========================================================= */

async function applyModules(guild, selected) {
    const data = getGuildData(guild.id);

    data.enabledModules = [
        ...new Set(selected)
    ];

    data.automod.enabled =
        selected.includes("automod");

    data.automod.invites =
        selected.includes("invites");

    data.automod.spam =
        selected.includes("spam");

    data.automod.mentions =
        selected.includes("mentions");

    data.automod.caps =
        selected.includes("caps");

    data.antiraid.enabled =
        selected.includes("antiraid");

    data.raidmode =
        selected.includes("raidmode");

    data.joinprotection =
        selected.includes("joinprotection");

    data.dmprotection =
        selected.includes("dmprotection");

    const createdChannels = [];

    /* HONEYPOT */

    if (selected.includes("honeypot")) {
        const channel =
            await createHoneypotChannel(guild);

        if (channel) {
            data.honeypot.channel = channel.id;
            data.honeypot.enabled = true;

            await postHoneypotPanel(
                guild,
                channel
            );

            createdChannels.push(
                `<#${channel.id}>`
            );
        }
    } else {
        data.honeypot.enabled = false;
    }

    /* VERIFICATION */

    if (selected.includes("verification")) {
        let verifiedRole =
            data.verification.role
                ? guild.roles.cache.get(
                    data.verification.role
                )
                : null;

        if (!verifiedRole) {
            verifiedRole =
                guild.roles.cache.find(
                    role =>
                        role.name === "Verified" &&
                        !role.managed
                );
        }

        if (!verifiedRole) {
            verifiedRole =
                await guild.roles.create({
                    name: "Verified",
                    reason:
                        "Ghosty verification setup"
                }).catch(() => null);
        }

        if (verifiedRole) {
            data.verification.role =
                verifiedRole.id;
        }

        const channel =
            await createVerificationChannel(
                guild
            );

        if (channel) {
            data.verification.channel =
                channel.id;

            data.verification.enabled =
                true;

            await postVerificationPanel(
                guild,
                channel
            );

            createdChannels.push(
                `<#${channel.id}>`
            );
        }
    } else {
        data.verification.enabled = false;
    }

    saveData();

    return createdChannels;
}

/* =========================================================
   COMMANDS
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
        .setName("antiraid")
        .setDescription("View Anti-Raid status."),

    new SlashCommandBuilder()
        .setName("raidmode")
        .setDescription("Toggle Raid Mode.")
        .addBooleanOption(option =>
            option
                .setName("enabled")
                .setDescription("Enable or disable Raid Mode.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("verification")
        .setDescription("View Verification status."),

    new SlashCommandBuilder()
        .setName("honeypot")
        .setDescription("View Honeypot status."),

    new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Open Ghosty settings."),

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
        .setName("setup")
        .setDescription("Configure Ghosty."),

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
   SETUP
========================================================= */

async function showSetup(interaction) {
    if (!(await requireAdmin(interaction))) {
        return;
    }

    const data =
        getGuildData(
            interaction.guild.id
        );

    return interaction.reply({
        embeds: [setupEmbed(data)],
        components: setupMenu(data),
        ephemeral: true
    });
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

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Member Banned",
                    `${user} has been permanently banned.\n\n` +
                    `**Reason:** ${reason}`
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

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Member Kicked",
                    `${user} has been kicked.\n\n` +
                    `**Reason:** ${reason}`
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
            getGuildData(
                interaction.guild.id
            );

        data.warnings[user.id] ??= [];

        data.warnings[user.id].push({
            reason,
            moderator: interaction.user.id,
            timestamp: Date.now()
        });

        saveData();

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Member Warned",
                    `${user} has been warned.\n\n` +
                    `**Reason:** ${reason}\n` +
                    `**Total Warnings:** ${data.warnings[user.id].length}`
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
            getGuildData(
                interaction.guild.id
            ).warnings[user.id] || [];

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
            getGuildData(
                interaction.guild.id
            );

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
            getGuildData(
                interaction.guild.id
            );

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
            getGuildData(
                interaction.guild.id
            );

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
                await channel.permissionOverwrites
                    .edit(
                        interaction.guild.roles.everyone,
                        {
                            SendMessages: null
                        }
                    )
                    .catch(() => {});
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

    /* ANTIRAID */

    if (command === "antiraid") {
        const data =
            getGuildData(
                interaction.guild.id
            );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Anti-Raid",
                    `**Status:** ${
                        data.antiraid.enabled
                            ? "Enabled"
                            : "Disabled"
                    }\n` +
                    `**Threshold:** ${data.antiraid.threshold} joins\n` +
                    `**Window:** ${data.antiraid.window / 1000} seconds`
                )
            ],
            ephemeral: true
        });
    }

    /* RAIDMODE */

    if (command === "raidmode") {
        if (!(await requireAdmin(interaction))) {
            return;
        }

        const enabled =
            interaction.options.getBoolean("enabled");

        const data =
            getGuildData(
                interaction.guild.id
            );

        data.raidmode = enabled;

        saveData();

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Raid Mode",
                    enabled
                        ? "Raid Mode has been activated."
                        : "Raid Mode has been disabled."
                )
            ],
            ephemeral: true
        });
    }

    /* VERIFICATION */

    if (command === "verification") {
        const data =
            getGuildData(
                interaction.guild.id
            );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Verification",
                    `**Status:** ${
                        data.verification.enabled
                            ? "Enabled"
                            : "Disabled"
                    }\n` +
                    `**Channel:** ${
                        data.verification.channel
                            ? `<#${data.verification.channel}>`
                            : "Not configured"
                    }\n` +
                    `**Role:** ${
                        data.verification.role
                            ? `<@&${data.verification.role}>`
                            : "Not configured"
                    }`
                )
            ],
            ephemeral: true
        });
    }

    /* HONEYPOT */

    if (command === "honeypot") {
        const data =
            getGuildData(
                interaction.guild.id
            );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Honeypot",
                    `**Status:** ${
                        data.honeypot.enabled
                            ? "Enabled"
                            : "Disabled"
                    }\n` +
                    `**Channel:** ${
                        data.honeypot.channel
                            ? `<#${data.honeypot.channel}>`
                            : "Not configured"
                    }\n` +
                    `**Members Kicked:** ${data.honeypot.kickCount}`
                )
            ],
            ephemeral: true
        });
    }

    /* SETTINGS */

    if (command === "settings") {
        return showSetup(interaction);
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
                    `**Bot:** ${
                        user.bot ? "Yes" : "No"
                    }\n` +
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
                        role.mentionable ? "Yes" : "No"
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
        const channel = interaction.channel;

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
                    "/unlock\n" +
                    "/lockdown\n" +
                    "/unlockdown\n\n" +

                    "**Security**\n" +
                    "/antiraid\n" +
                    "/raidmode\n" +
                    "/verification\n" +
                    "/honeypot\n" +
                    "/settings\n\n" +

                    "**Information**\n" +
                    "/userinfo\n" +
                    "/serverinfo\n" +
                    "/roleinfo\n" +
                    "/channelinfo\n" +
                    "/avatar\n\n" +

                    "**Utility**\n" +
                    "/setup\n" +
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

    /* VERIFICATION IS PUBLIC */

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

        if (!data.verification.role) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "The Verified role has not been configured."
                    )
                ],
                ephemeral: true
            });
        }

        const member =
            interaction.guild.members.cache.get(
                interaction.user.id
            );

        if (
            member?.roles.cache.has(
                data.verification.role
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

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "verification_modal"
                )
                .setTitle(
                    "Ghosty Verification"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "verification_code"
                )
                .setLabel(
                    `Enter your code: ${code}`
                )
                .setPlaceholder(
                    "Enter the 6 digit code"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setMinLength(6)
                .setMaxLength(6)
                .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                input
            )
        );

        return interaction.showModal(
            modal
        );
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

    /* BACK */

    if (id === "setup_back") {
        const preview = {
            ...data,
            enabledModules:
                data.pendingSetup ||
                data.enabledModules
        };

        return interaction.update({
            embeds: [setupEmbed(preview)],
            components: setupMenu(preview)
        });
    }

    /* ENABLE */

    if (id === "setup_enable") {
        const selected =
            data.pendingSetup ||
            data.enabledModules;

        const created =
            await applyModules(
                interaction.guild,
                selected
            );

        data.pendingSetup = null;

        saveData();

        const enabledText =
            selected.length
                ? selected
                    .map(
                        module =>
                            `• **${MODULES[module]}**`
                    )
                    .join("\n")
                : "• No modules selected";

        const createdText =
            created.length
                ? `\n\n**Created Channels:**\n${created.join("\n")}`
                : "";

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Successfully Enabled",
                    "Ghosty has successfully enabled the following protection systems:\n\n" +
                    enabledText +
                    createdText +
                    "\n\nGhosty is now configured with your selected systems."
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

    /* SETTINGS */

    if (id === "setup_settings") {
        return interaction.update({
            embeds: [setupEmbed(data)],
            components: setupMenu(data)
        });
    }

    /* DISABLED HONEYPOT COUNTER */

    if (id === "honeypot_counter") {
        return interaction.deferUpdate();
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

    if (interaction.customId === "setup_modules") {
        data.pendingSetup =
            interaction.values;

        saveData();

        const preview = {
            ...data,
            enabledModules:
                interaction.values
        };

        return interaction.update({
            embeds: [setupEmbed(preview)],
            components: setupMenu(preview)
        });
    }
}

/* =========================================================
   MODAL HANDLER
========================================================= */

async function handleModal(interaction) {
    if (
        interaction.customId !==
        "verification_modal"
    ) {
        return;
    }

    const data =
        getGuildData(
            interaction.guild.id
        );

    const pending =
        data.verification.pending[
            interaction.user.id
        ];

    if (!pending) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "You do not currently have a verification code. Please press Verify again."
                )
            ],
            ephemeral: true
        });
    }

    const age =
        Date.now() - pending.created;

    if (age > 5 * 60 * 1000) {
        delete data.verification.pending[
            interaction.user.id
        ];

        saveData();

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Your verification code has expired. Please request a new one."
                )
            ],
            ephemeral: true
        });
    }

    const entered =
        interaction.fields.getTextInputValue(
            "verification_code"
        ).trim();

    if (entered !== pending.code) {
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
        await interaction.guild.members.fetch(
            interaction.user.id
        );

    if (
        role.position >=
        interaction.guild.members.me.roles.highest.position
    ) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Ghosty cannot assign the Verified role because the role is above Ghosty's highest role."
                )
            ],
            ephemeral: true
        });
    }

    await member.roles.add(
        role,
        "Ghosty verification"
    );

    delete data.verification.pending[
        interaction.user.id
    ];

    saveData();

    return interaction.reply({
        embeds: [
            makeEmbed(
                "Verification Complete",
                "You have successfully verified your account and received access to the server."
            )
        ],
        ephemeral: true
    });
}

/* =========================================================
   MESSAGE TRACKER
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

        /* =================================================
           HONEYPOT
        ================================================= */

        if (
            data.honeypot.enabled &&
            message.channel.id ===
                data.honeypot.channel
        ) {
            const member =
                message.member;

            await message.delete().catch(() => {});

            if (!member) {
                return;
            }

            if (
                member.permissions.has(
                    PermissionsBitField.Flags.Administrator
                )
            ) {
                return;
            }

            data.honeypot.kickCount++;

            data.honeypot.violations[
                member.id
            ] =
                (
                    data.honeypot.violations[
                        member.id
                    ] || 0
                ) + 1;

            saveData();

            if (member.kickable) {
                await member.kick(
                    "Ghosty Honeypot"
                ).catch(() => {});
            }

            const recent =
                await message.channel.messages
                    .fetch({
                        limit: 20
                    })
                    .catch(() => null);

            const panel =
                recent?.find(
                    msg =>
                        msg.author.id ===
                            client.user.id &&
                        msg.embeds[0]?.title ===
                            "Ghosty Honeypot"
                );

            if (panel) {
                await panel.edit({
                    embeds: [
                        honeypotPanel(data)
                    ],
                    components:
                        honeypotComponents(data)
                }).catch(() => {});
            }

            return;
        }

        /* =================================================
           AUTOMOD
        ================================================= */

        if (!data.automod.enabled) {
            return;
        }

        let violation = null;

        if (
            data.automod.invites &&
            /(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)/i.test(
                message.content
            )
        ) {
            violation =
                "Discord invite links are not allowed.";
        }

        if (
            !violation &&
            data.automod.mentions &&
            message.mentions.users.size >= 6
        ) {
            violation =
                "Excessive mentions detected.";
        }

        if (
            !violation &&
            data.automod.caps &&
            message.content.length >= 12
        ) {
            const letters =
                message.content.replace(
                    /[^a-zA-Z]/g,
                    ""
                );

            if (
                letters.length >= 8 &&
                letters === letters.toUpperCase()
            ) {
                violation =
                    "Excessive capital letters detected.";
            }
        }

        if (
            !violation &&
            data.automod.spam
        ) {
            const key =
                `${message.guild.id}:${message.author.id}`;

            const now = Date.now();

            const recent =
                (
                    messageTracker.get(key) ||
                    []
                ).filter(
                    timestamp =>
                        now - timestamp < 5000
                );

            recent.push(now);

            messageTracker.set(
                key,
                recent
            );

            if (recent.length >= 6) {
                violation =
                    "Message spam detected.";
            }
        }

        if (!violation) {
            return;
        }

        await message.delete().catch(() => {});
    }
);

/* =========================================================
   ANTI RAID
========================================================= */

client.on(
    "guildMemberAdd",
    async member => {
        const data =
            getGuildData(
                member.guild.id
            );

        /* JOIN PROTECTION */

        if (
            data.joinprotection &&
            !member.user.bot
        ) {
            const accountAge =
                Date.now() -
                member.user.createdTimestamp;

            const oneDay =
                24 * 60 * 60 * 1000;

            if (
                accountAge < oneDay &&
                member.kickable
            ) {
                await member.kick(
                    "Ghosty Join Protection"
                ).catch(() => {});

                return;
            }
        }

        /* ANTI RAID */

        if (!data.antiraid.enabled) {
            return;
        }

        const now = Date.now();

        data.antiraid.joins =
            (
                data.antiraid.joins || []
            ).filter(
                timestamp =>
                    now - timestamp <
                    data.antiraid.window
            );

        data.antiraid.joins.push(now);

        saveData();

        if (
            data.antiraid.joins.length >=
            data.antiraid.threshold
        ) {
            data.raidmode = true;

            data.enabledModules = [
                ...new Set([
                    ...data.enabledModules,
                    "raidmode"
                ])
            ];

            saveData();

            if (!data.lockdown.enabled) {
                data.lockdown.enabled = true;
                data.lockdown.channels = {};

                for (
                    const channel of
                        member.guild.channels.cache.values()
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
                            member.guild.roles.everyone.id
                        );

                    data.lockdown.channels[
                        channel.id
                    ] = {
                        allow:
                            overwrite?.allow.bitfield.toString() ||
                            "0",
                        deny:
                            overwrite?.deny.bitfield.toString() ||
                            "0"
                    };

                    await channel.permissionOverwrites
                        .edit(
                            member.guild.roles.everyone,
                            {
                                SendMessages: false
                            }
                        )
                        .catch(() => {});
                }

                saveData();
            }
        }
    }
);

/* =========================================================
   CLEAN SPAM TRACKER
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
                    now - timestamp < 5000
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
   READY
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

        const channel =
            guild.channels.cache.find(
                channel =>
                    channel.type ===
                        ChannelType.GuildText &&
                    channel.permissionsFor(
                        guild.members.me
                    )?.has(
                        PermissionsBitField.Flags.SendMessages
                    )
            );

        if (channel) {
            const recent =
                await channel.messages.fetch({
                    limit: 20
                }).catch(() => null);

            const exists =
                recent?.some(
                    message =>
                        message.author.id ===
                            client.user.id &&
                        message.embeds[0]?.title ===
                            "Thanks for inviting Ghosty!"
                );

            if (!exists) {
                await channel.send({
                    embeds: [
                        welcomeEmbed(guild)
                    ],
                    components:
                        welcomeComponents()
                }).catch(() => {});
            }
        }
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
