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
    RoleSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
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

const DATA_DIR = path.join(__dirname, "../data");
const DATA_FILE = path.join(DATA_DIR, "guilds.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/* =========================================================
   DATA
========================================================= */

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

function getGuildData(guildId) {
    if (!guildData[guildId]) {
        guildData[guildId] = {
            logChannel: null,
            staffRole: null,

            honeypot: {
                enabled: false,
                channel: null,
                kicks: 0
            },

            automod: {
                enabled: false,
                spam: true,
                mentions: true,
                invites: true,
                caps: false
            },

            verification: {
                enabled: false,
                channel: null,
                role: null
            },

            warnings: {},

            lockdown: {
                enabled: false,
                channels: {}
            }
        };

        saveData();
    }

    return guildData[guildId];
}

/* =========================================================
   DATA MIGRATION
========================================================= */

function ensureGuildData(data) {
    if (!data.honeypot) {
        data.honeypot = {
            enabled: false,
            channel: null,
            kicks: 0
        };
    }

    if (!data.automod) {
        data.automod = {
            enabled: false,
            spam: true,
            mentions: true,
            invites: true,
            caps: false
        };
    }

    if (!data.verification) {
        data.verification = {
            enabled: false,
            channel: null,
            role: null
        };
    }

    if (!data.warnings) {
        data.warnings = {};
    }

    if (!data.lockdown) {
        data.lockdown = {
            enabled: false,
            channels: {}
        };
    }

    if (!("logChannel" in data)) {
        data.logChannel = null;
    }

    if (!("staffRole" in data)) {
        data.staffRole = null;
    }

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
                .setDescription("Reason for the ban.")
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
                .setDescription("Member to kick.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the kick.")
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Timeout a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to timeout.")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription("Timeout duration.")
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
        .setDescription("View a member's warnings.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clear a member's warnings.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    /* CHANNEL MANAGEMENT */

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
                .setDescription("Slowmode seconds.")
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
        .setDescription("End the server lockdown."),

    /* CONFIGURATION */

    new SlashCommandBuilder()
        .setName("ghostysetup")
        .setDescription("Open the main Ghosty configuration panel."),

    new SlashCommandBuilder()
        .setName("honeypot")
        .setDescription("Configure the Ghosty honeypot."),

    new SlashCommandBuilder()
        .setName("verification")
        .setDescription("Configure Ghosty verification."),

    new SlashCommandBuilder()
        .setName("verifychannel")
        .setDescription("Create and configure the verification panel."),

    /* INFORMATION */

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("View user information.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to inspect.")
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
                .setDescription("Role to inspect.")
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
        .setDescription("View Ghosty's commands."),

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
        .setDescription("Get Ghosty support information.")
].map(command => command.toJSON());

console.log(`Loaded ${commands.length} commands.`);

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
    if (isAdmin(interaction)) {
        return true;
    }

    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    if (
        data.staffRole &&
        interaction.member?.roles?.cache?.has(data.staffRole)
    ) {
        return true;
    }

    return (
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
                "You need Administrator permissions to use this command."
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
                "You need staff or moderation permissions to use this command."
            )
        ],
        ephemeral: true
    });

    return false;
}

/* =========================================================
   LOGGING
========================================================= */

async function sendLog(guild, logEmbed) {
    const data = ensureGuildData(
        getGuildData(guild.id)
    );

    if (!data.logChannel) {
        return;
    }

    const channel = guild.channels.cache.get(
        data.logChannel
    );

    if (!channel || !channel.isTextBased()) {
        return;
    }

    await channel.send({
        embeds: [logEmbed]
    }).catch(() => {});
}

/* =========================================================
   VERIFICATION CODES
========================================================= */

const verificationCodes = new Map();

function generateVerificationCode() {
    return Math.floor(
        100000 + Math.random() * 900000
    ).toString();
}

/* =========================================================
   COMMAND REGISTRATION
========================================================= */

async function registerCommands() {
    try {
        const rest = new REST({
            version: "10"
        }).setToken(process.env.DISCORD_TOKEN);

        await rest.put(
            Routes.applicationCommands(client.user.id),
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
   READY
========================================================= */

client.once("ready", async () => {
    console.log(
        `Ghosty is online as ${client.user.tag}`
    );

    console.log(
        `Serving ${client.guilds.cache.size} server(s).`
    );

    await registerCommands();
});

/* =========================================================
   MESSAGE TRACKER
========================================================= */

const messageTracker = new Map();

/* =========================================================
   MESSAGE CREATE
========================================================= */

client.on("messageCreate", async message => {
    if (!message.guild || message.author.bot) {
        return;
    }

    const data = ensureGuildData(
        getGuildData(message.guild.id)
    );

    /* HONEYPOT */

    if (
        data.honeypot.enabled &&
        data.honeypot.channel === message.channel.id
    ) {
        await message.delete().catch(() => {});

        const member = message.member;

        if (!member) {
            return;
        }

        const protectedMember =
            member.permissions.has(
                PermissionsBitField.Flags.Administrator
            ) ||
            (
                data.staffRole &&
                member.roles.cache.has(data.staffRole)
            );

        if (protectedMember || !member.kickable) {
            await sendLog(
                message.guild,
                makeEmbed(
                    "Honeypot Triggered",
                    `Ghosty detected a honeypot message but could not remove the member.\n\n` +
                    `**User:** ${message.author}\n` +
                    `**Channel:** ${message.channel}`
                )
            );

            return;
        }

        const kicked = await member
            .kick("Ghosty Honeypot")
            .then(() => true)
            .catch(() => false);

        if (kicked) {
            data.honeypot.kicks++;
            saveData();

            await sendLog(
                message.guild,
                makeEmbed(
                    "Honeypot Triggered",
                    `A member was automatically kicked.\n\n` +
                    `**User:** ${message.author}\n` +
                    `**User ID:** ${message.author.id}\n` +
                    `**Channel:** ${message.channel}\n` +
                    `**Action:** Kick\n` +
                    `**Total Honeypot Kicks:** ${data.honeypot.kicks}`
                )
            );
        }

        return;
    }

    /* AUTOMOD */

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
        const letters = message.content.replace(
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

        const previous =
            messageTracker.get(key) || [];

        const recent =
            previous.filter(
                timestamp =>
                    now - timestamp < 5000
            );

        recent.push(now);

        messageTracker.set(key, recent);

        if (recent.length >= 6) {
            violation =
                "Message spam detected.";
        }
    }

    if (!violation) {
        return;
    }

    await message.delete().catch(() => {});

    await sendLog(
        message.guild,
        makeEmbed(
            "AutoMod Action",
            `Ghosty removed a message for violating AutoMod.\n\n` +
            `**User:** ${message.author}\n` +
            `**User ID:** ${message.author.id}\n` +
            `**Channel:** ${message.channel}\n` +
            `**Reason:** ${violation}`
        )
    );
});

/* =========================================================
   CLEAN MESSAGE TRACKER
========================================================= */

setInterval(() => {
    const now = Date.now();

    for (const [key, timestamps] of messageTracker.entries()) {
        const recent = timestamps.filter(
            timestamp =>
                now - timestamp < 5000
        );

        if (recent.length === 0) {
            messageTracker.delete(key);
        } else {
            messageTracker.set(key, recent);
        }
    }
}, 30000);

/* =========================================================
   INTERACTIONS
========================================================= */

client.on("interactionCreate", async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            await handleCommand(interaction);
            return;
        }

        if (interaction.isButton()) {
            await handleButton(interaction);
            return;
        }

        if (interaction.isChannelSelectMenu()) {
            await handleChannelSelect(interaction);
            return;
        }

        if (interaction.isRoleSelectMenu()) {
            await handleRoleSelect(interaction);
            return;
        }

        if (interaction.isStringSelectMenu()) {
            await handleStringSelect(interaction);
            return;
        }

        if (interaction.isModalSubmit()) {
            await handleModal(interaction);
        }
    } catch (error) {
        console.error("Interaction error:", error);

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
});

/* =========================================================
   COMMAND HANDLER
========================================================= */

async function handleCommand(interaction) {
    const command = interaction.commandName;

    const adminCommands = [
        "ghostysetup",
        "honeypot",
        "verification",
        "verifychannel",
        "lockdown",
        "unlockdown"
    ];

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
        "unlock"
    ];

    if (adminCommands.includes(command)) {
        if (!(await requireAdmin(interaction))) {
            return;
        }
    }

    if (staffCommands.includes(command)) {
        if (!(await requireStaff(interaction))) {
            return;
        }
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
                `**User ID:** ${user.id}\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Reason:** ${reason}`
            )
        );

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
        const userId =
            interaction.options.getString("userid");

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

        try {
            await interaction.guild.members.unban(
                userId
            );

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
                    `${user} has been timed out for **${minutes} minute(s)**.\n\n` +
                    `**Reason:** ${reason}`
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

        const data = ensureGuildData(
            getGuildData(interaction.guild.id)
        );

        if (!data.warnings[user.id]) {
            data.warnings[user.id] = [];
        }

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

        const data = ensureGuildData(
            getGuildData(interaction.guild.id)
        );

        const warnings =
            data.warnings[user.id] || [];

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

        const data = ensureGuildData(
            getGuildData(interaction.guild.id)
        );

        const count =
            data.warnings[user.id]?.length || 0;

        delete data.warnings[user.id];

        saveData();

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Warnings Cleared",
                    `All warnings for ${user} have been removed.\n\n` +
                    `**Removed:** ${count}`
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

    /* LOCK */

    if (command === "lock") {
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

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages: false
            }
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Channel Locked",
                    `${interaction.channel} has been locked.`
                )
            ],
            ephemeral: true
        });
    }

    /* UNLOCK */

    if (command === "unlock") {
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

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages: null
            }
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Channel Unlocked",
                    `${interaction.channel} has been unlocked.`
                )
            ],
            ephemeral: true
        });
    }

    /* LOCKDOWN */

    if (command === "lockdown") {
        const data = ensureGuildData(
            getGuildData(interaction.guild.id)
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

        const channels =
            interaction.guild.channels.cache.filter(
                channel =>
                    channel.type === ChannelType.GuildText
            );

        for (const channel of channels.values()) {
            const overwrite =
                channel.permissionOverwrites.cache.get(
                    interaction.guild.roles.everyone.id
                );

            data.lockdown.channels[channel.id] = {
                allow: overwrite
                    ? overwrite.allow.bitfield.toString()
                    : "0",
                deny: overwrite
                    ? overwrite.deny.bitfield.toString()
                    : "0"
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
                    `Ghosty has locked **${locked}** text channel(s).\n\n` +
                    `Members can no longer send messages in the locked channels.`
                )
            ],
            ephemeral: true
        });
    }

    /* UNLOCKDOWN */

    if (command === "unlockdown") {
        const data = ensureGuildData(
            getGuildData(interaction.guild.id)
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
            const [channelId, previous]
            of Object.entries(data.lockdown.channels)
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
                        allow: BigInt(previous.allow || "0"),
                        deny: BigInt(previous.deny || "0")
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
                    `Ghosty has ended the server lockdown and restored **${restored}** channel(s).`
                )
            ],
            ephemeral: true
        });
    }

    /* GHOSTY SETUP */

    if (command === "ghostysetup") {
        return showSetup(interaction);
    }

    /* HONEYPOT */

    if (command === "honeypot") {
        return showHoneypot(interaction);
    }

    /* VERIFICATION */

    if (command === "verification") {
        return showVerification(interaction);
    }

    /* VERIFY CHANNEL */

    if (command === "verifychannel") {
        return showVerifyChannel(interaction);
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

        const roles =
            member
                ? member.roles.cache
                    .filter(
                        role =>
                            role.id !== interaction.guild.id
                    )
                    .sort(
                        (a, b) =>
                            b.position - a.position
                    )
                    .map(role => role.toString())
                    .join(", ") || "None"
                : "Not a member";

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "User Information",
                    `**Username:** ${user.tag}\n` +
                    `**ID:** ${user.id}\n` +
                    `**Bot:** ${user.bot ? "Yes" : "No"}\n` +
                    `**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:F>\n\n` +
                    `**Server Member:** ${member ? "Yes" : "No"}\n` +
                    `**Joined:** ${
                        member?.joinedTimestamp
                            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
                            : "Unknown"
                    }\n` +
                    `**Highest Role:** ${
                        member
                            ? member.roles.highest.toString()
                            : "None"
                    }\n` +
                    `**Roles:** ${roles}`
                )
            ],
            ephemeral: true
        });
    }

    /* SERVERINFO */

    if (command === "serverinfo") {
        const guild = interaction.guild;

        const owner =
            await guild.fetchOwner()
                .catch(() => null);

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Server Information",
                    `**Name:** ${guild.name}\n` +
                    `**ID:** ${guild.id}\n` +
                    `**Owner:** ${owner?.user.tag || guild.ownerId}\n` +
                    `**Members:** ${guild.memberCount}\n` +
                    `**Roles:** ${guild.roles.cache.size}\n` +
                    `**Channels:** ${guild.channels.cache.size}\n` +
                    `**Boost Level:** ${guild.premiumTier}\n` +
                    `**Boosts:** ${guild.premiumSubscriptionCount || 0}\n` +
                    `**Verification:** ${guild.verificationLevel}\n` +
                    `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
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
                    `**Mentionable:** ${role.mentionable ? "Yes" : "No"}\n` +
                    `**Hoisted:** ${role.hoist ? "Yes" : "No"}\n` +
                    `**Managed:** ${role.managed ? "Yes" : "No"}\n` +
                    `**Created:** <t:${Math.floor(role.createdTimestamp / 1000)}:F>`
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
                    `**Category:** ${channel.parent?.name || "None"}\n` +
                    `**Position:** ${channel.position}\n` +
                    `**Slowmode:** ${
                        "rateLimitPerUser" in channel
                            ? `${channel.rateLimitPerUser}s`
                            : "Unavailable"
                    }\n` +
                    `**Created:** <t:${Math.floor(channel.createdTimestamp / 1000)}:F>`
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
                    `**Moderation**\n` +
                    `/ban\n/unban\n/kick\n/timeout\n/untimeout\n/warn\n/warnings\n/clearwarnings\n\n` +
                    `**Channel Management**\n` +
                    `/purge\n/slowmode\n/lock\n/unlock\n/lockdown\n/unlockdown\n\n` +
                    `**Configuration**\n` +
                    `/ghostysetup\n/honeypot\n/verification\n/verifychannel\n\n` +
                    `**Information**\n` +
                    `/userinfo\n/serverinfo\n/roleinfo\n/channelinfo\n/avatar\n\n` +
                    `**Utility**\n` +
                    `/help\n/ping\n/uptime\n/botinfo\n/support`
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
                    `**Status:** Online`
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
        const totalUsers =
            client.guilds.cache.reduce(
                (total, guild) =>
                    total + guild.memberCount,
                0
            );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Ghosty",
                    `Discord moderation and server management bot.\n\n` +
                    `**Version:** 2.0.0\n` +
                    `**Bot ID:** ${client.user.id}\n` +
                    `**Servers:** ${client.guilds.cache.size}\n` +
                    `**Users:** ${totalUsers.toLocaleString()}\n` +
                    `**Commands:** ${commands.length}\n` +
                    `**Discord.js:** ${require("discord.js").version}\n` +
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
                    `Join the official Ghosty support server:\n` +
                    `https://discord.gg/VyjrM6AXZ\n\n` +
                    `Our support server is where you can get help, report issues and ask questions about Ghosty.`
                )
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   MAIN SETUP PANEL
========================================================= */

async function showSetup(interaction) {
    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const row1 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("setup_automod")
                    .setLabel("AutoMod")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("setup_logs")
                    .setLabel("Logging")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("setup_staff")
                    .setLabel("Staff Role")
                    .setStyle(ButtonStyle.Secondary)
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("setup_refresh")
                    .setLabel("Refresh")
                    .setStyle(ButtonStyle.Secondary)
            );

    return interaction.reply({
        embeds: [
            makeEmbed(
                "Ghosty Setup",
                `Configure Ghosty using the buttons below.\n\n` +
                `### Security\n` +
                `**AutoMod:** ${data.automod.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                `**Honeypot:** ${data.honeypot.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                `**Verification:** ${data.verification.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n\n` +
                `### Server Configuration\n` +
                `**Logs:** ${data.logChannel ? `<#${data.logChannel}>` : "Not configured"}\n` +
                `**Staff Role:** ${data.staffRole ? `<@&${data.staffRole}>` : "Not configured"}\n` +
                `**Verification Channel:** ${data.verification.channel ? `<#${data.verification.channel}>` : "Not configured"}\n` +
                `**Verified Role:** ${data.verification.role ? `<@&${data.verification.role}>` : "Not configured"}\n\n` +
                `### Protection\n` +
                `**Spam:** ${data.automod.spam ? "Enabled" : "Disabled"}\n` +
                `**Mentions:** ${data.automod.mentions ? "Enabled" : "Disabled"}\n` +
                `**Invites:** ${data.automod.invites ? "Enabled" : "Disabled"}\n` +
                `**Caps:** ${data.automod.caps ? "Enabled" : "Disabled"}\n\n` +
                `Use the buttons below to configure Ghosty.`
            )
        ],
        components: [
            row1,
            row2
        ],
        ephemeral: true
    });
}

/* =========================================================
   HONEYPOT COMMAND
========================================================= */

async function showHoneypot(interaction) {
    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const menu =
        new ChannelSelectMenuBuilder()
            .setCustomId("select_honeypot_channel")
            .setPlaceholder("Select the honeypot channel")
            .setChannelTypes(ChannelType.GuildText);

    const buttons =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("honeypot_enable")
                    .setLabel("Enable")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("honeypot_disable")
                    .setLabel("Disable")
                    .setStyle(ButtonStyle.Danger)
            );

    return interaction.reply({
        embeds: [
            makeEmbed(
                "Ghosty Honeypot",
                `The honeypot automatically removes members who send a message in the selected honeypot channel.\n\n` +
                `**Status:** ${data.honeypot.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                `**Channel:** ${data.honeypot.channel ? `<#${data.honeypot.channel}>` : "Not configured"}\n` +
                `**Total Kicks:** ${data.honeypot.kicks}\n\n` +
                `Select a channel below and then enable the honeypot.`
            )
        ],
        components: [
            new ActionRowBuilder().addComponents(menu),
            buttons
        ],
        ephemeral: true
    });
}

/* =========================================================
   VERIFICATION COMMAND
========================================================= */

async function showVerification(interaction) {
    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("verification_enable")
                    .setLabel("Enable")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("verification_disable")
                    .setLabel("Disable")
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId("verification_settings")
                    .setLabel("Settings")
                    .setStyle(ButtonStyle.Primary)
            );

    return interaction.reply({
        embeds: [
            makeEmbed(
                "Ghosty Verification",
                `Configure Ghosty's code-based verification system.\n\n` +
                `**Status:** ${data.verification.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                `**Channel:** ${data.verification.channel ? `<#${data.verification.channel}>` : "Not configured"}\n` +
                `**Verified Role:** ${data.verification.role ? `<@&${data.verification.role}>` : "Not configured"}\n\n` +
                `Members will be required to enter a generated verification code before receiving the verified role.`
            )
        ],
        components: [row],
        ephemeral: true
    });
}

/* =========================================================
   VERIFY CHANNEL SETUP
========================================================= */

async function showVerifyChannel(interaction) {
    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const channelMenu =
        new ChannelSelectMenuBuilder()
            .setCustomId("verify_setup_channel")
            .setPlaceholder("Set verification channel")
            .setChannelTypes(ChannelType.GuildText);

    const roleMenu =
        new RoleSelectMenuBuilder()
            .setCustomId("verify_setup_role")
            .setPlaceholder("Set verified role");

    const submit =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("verify_setup_submit")
                    .setLabel("Submit")
                    .setStyle(ButtonStyle.Success)
            );

    return interaction.reply({
        embeds: [
            makeEmbed(
                "Verification Channel Setup",
                `Configure the verification panel before publishing it.\n\n` +
                `**Channel:** ${data.verification.channel ? `<#${data.verification.channel}>` : "Not selected"}\n` +
                `**Verified Role:** ${data.verification.role ? `<@&${data.verification.role}>` : "Not selected"}\n\n` +
                `Select both options and press **Submit** to send the verification embed.`
            )
        ],
        components: [
            new ActionRowBuilder().addComponents(channelMenu),
            new ActionRowBuilder().addComponents(roleMenu),
            submit
        ],
        ephemeral: true
    });
}

/* =========================================================
   AUTOMOD PANEL
========================================================= */

async function showAutoMod(interaction) {
    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const row1 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("automod_enable")
                    .setLabel("Enable")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("automod_disable")
                    .setLabel("Disable")
                    .setStyle(ButtonStyle.Danger)
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("automod_toggle")
                    .setPlaceholder("Configure protection")
                    .addOptions(
                        {
                            label: "Spam Protection",
                            description: data.automod.spam
                                ? "Currently enabled"
                                : "Currently disabled",
                            value: "spam"
                        },
                        {
                            label: "Mention Protection",
                            description: data.automod.mentions
                                ? "Currently enabled"
                                : "Currently disabled",
                            value: "mentions"
                        },
                        {
                            label: "Invite Protection",
                            description: data.automod.invites
                                ? "Currently enabled"
                                : "Currently disabled",
                            value: "invites"
                        },
                        {
                            label: "Caps Protection",
                            description: data.automod.caps
                                ? "Currently enabled"
                                : "Currently disabled",
                            value: "caps"
                        }
                    )
            );

    return interaction.update({
        embeds: [
            makeEmbed(
                "Ghosty AutoMod",
                `**Status:** ${data.automod.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n\n` +
                `**Spam:** ${data.automod.spam ? "Enabled" : "Disabled"}\n` +
                `**Mentions:** ${data.automod.mentions ? "Enabled" : "Disabled"}\n` +
                `**Invites:** ${data.automod.invites ? "Enabled" : "Disabled"}\n` +
                `**Caps:** ${data.automod.caps ? "Enabled" : "Disabled"}\n\n` +
                `Use the controls below.`
            )
        ],
        components: [
            row1,
            row2
        ]
    });
}

/* =========================================================
   LOGGING PANEL
========================================================= */

async function showLogsFromSetup(interaction) {
    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const menu =
        new ChannelSelectMenuBuilder()
            .setCustomId("select_log_channel")
            .setPlaceholder("Select the logging channel")
            .setChannelTypes(ChannelType.GuildText);

    const back =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("setup_refresh")
                    .setLabel("Back to Setup")
                    .setStyle(ButtonStyle.Secondary)
            );

    return interaction.update({
        embeds: [
            makeEmbed(
                "Ghosty Logging",
                `**Current Channel:** ${
                    data.logChannel
                        ? `<#${data.logChannel}>`
                        : "Not configured"
                }\n\nSelect the channel Ghosty should use for moderation and security logs.`
            )
        ],
        components: [
            new ActionRowBuilder().addComponents(menu),
            back
        ]
    });
}

/* =========================================================
   STAFF PANEL
========================================================= */

async function showStaffSetup(interaction) {
    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const menu =
        new RoleSelectMenuBuilder()
            .setCustomId("select_staff_role")
            .setPlaceholder("Select the Ghosty staff role");

    const back =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("setup_refresh")
                    .setLabel("Back to Setup")
                    .setStyle(ButtonStyle.Secondary)
            );

    return interaction.update({
        embeds: [
            makeEmbed(
                "Ghosty Staff Role",
                `**Current Role:** ${
                    data.staffRole
                        ? `<@&${data.staffRole}>`
                        : "Not configured"
                }\n\nSelect the role that should count as Ghosty staff.`
            )
        ],
        components: [
            new ActionRowBuilder().addComponents(menu),
            back
        ]
    });
}

/* =========================================================
   BUTTON HANDLER
========================================================= */

async function handleButton(interaction) {
    const publicButtons = [
        "verification_start",
        "verification_enter"
    ];

    if (!publicButtons.includes(interaction.customId)) {
        if (!isAdmin(interaction)) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need Administrator permissions."
                    )
                ],
                ephemeral: true
            });
        }
    }

    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const id = interaction.customId;

    /* MAIN SETUP */

    if (id === "setup_refresh") {
        return showSetupFromUpdate(interaction);
    }

    if (id === "setup_automod") {
        return showAutoMod(interaction);
    }

    if (id === "setup_logs") {
        return showLogsFromSetup(interaction);
    }

    if (id === "setup_staff") {
        return showStaffSetup(interaction);
    }

    /* AUTOMOD */

    if (id === "automod_enable") {
        data.automod.enabled = true;
        saveData();

        return showAutoMod(interaction);
    }

    if (id === "automod_disable") {
        data.automod.enabled = false;
        saveData();

        return showAutoMod(interaction);
    }

    /* HONEYPOT */

    if (id === "honeypot_enable") {
        if (!data.honeypot.channel) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Select a honeypot channel first."
                    )
                ],
                ephemeral: true
            });
        }

        data.honeypot.enabled = true;
        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Honeypot Enabled",
                    `The honeypot is now active in <#${data.honeypot.channel}>.`
                )
            ],
            components: []
        });
    }

    if (id === "honeypot_disable") {
        data.honeypot.enabled = false;
        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Honeypot Disabled",
                    "The honeypot has been disabled."
                )
            ],
            components: []
        });
    }

    /* VERIFICATION */

    if (id === "verification_enable") {
        if (
            !data.verification.channel ||
            !data.verification.role
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need to set both the verification channel and verified role first."
                    )
                ],
                ephemeral: true
            });
        }

        data.verification.enabled = true;
        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Verification Enabled",
                    `Ghosty verification is now enabled.\n\n` +
                    `**Channel:** <#${data.verification.channel}>\n` +
                    `**Role:** <@&${data.verification.role}>`
                )
            ],
            components: []
        });
    }

    if (id === "verification_disable") {
        data.verification.enabled = false;
        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Verification Disabled",
                    "Ghosty verification has been disabled."
                )
            ],
            components: []
        });
    }

    if (id === "verification_settings") {
        return showVerifyChannelUpdate(interaction);
    }

    /* VERIFY PANEL */

    if (id === "verification_start") {
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
                        "The verification role has not been configured."
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
                        "I could not find you in this server."
                    )
                ],
                ephemeral: true
            });
        }

        if (member.roles.cache.has(data.verification.role)) {
            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "Already Verified",
                        "You already have the verified role."
                    )
                ],
                ephemeral: true
            });
        }

        const code =
            generateVerificationCode();

        verificationCodes.set(
            `${interaction.guild.id}:${interaction.user.id}`,
            {
                code,
                expires: Date.now() + 10 * 60 * 1000
            }
        );

        const enterButton =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("verification_enter")
                        .setLabel("Enter Verification Code")
                        .setStyle(ButtonStyle.Primary)
                );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Your Verification Code",
                    `Your verification code is:\n\n` +
                    `# ${code}\n\n` +
                    `This code expires in **10 minutes**.\n\n` +
                    `Click **Enter Verification Code** below and enter the code exactly as shown.`
                )
            ],
            components: [enterButton],
            ephemeral: true
        });
    }

    if (id === "verification_enter") {
        const modal =
            new ModalBuilder()
                .setCustomId("verification_code_modal")
                .setTitle("Ghosty Verification");

        const input =
            new TextInputBuilder()
                .setCustomId("verification_code")
                .setLabel("Enter your 6-digit code")
                .setPlaceholder("123456")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(6)
                .setMaxLength(6);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
    }

    /* VERIFY CHANNEL SETUP */

    if (id === "verify_setup_submit") {
        if (
            !data.verification.channel ||
            !data.verification.role
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Please select both a verification channel and verified role before submitting."
                    )
                ],
                ephemeral: true
            });
        }

        const channel =
            interaction.guild.channels.cache.get(
                data.verification.channel
            );

        if (!channel || !channel.isTextBased()) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "The selected verification channel could not be found."
                    )
                ],
                ephemeral: true
            });
        }

        const embed =
            makeEmbed(
                "Server Verification",
                `Welcome to **${interaction.guild.name}**.\n\n` +
                `Before accessing the server, you must complete Ghosty's verification process.\n\n` +
                `Click the button below to receive a unique verification code. You will then be asked to enter the code to confirm that you are a real member.\n\n` +
                `**Verification includes:**\n` +
                `• Unique verification code\n` +
                `• Code expiry\n` +
                `• Automatic verified role\n` +
                `• Protection against repeated verification\n\n` +
                `Once successfully verified, you will receive access to the verified areas of the server.`
            );

        const row =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("verification_start")
                        .setLabel("Verify")
                        .setStyle(ButtonStyle.Success)
                );

        await channel.send({
            embeds: [embed],
            components: [row]
        });

        data.verification.enabled = true;
        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Verification Panel Published",
                    `The verification panel has been sent to <#${channel.id}>.\n\n` +
                    `**Verified Role:** <@&${data.verification.role}>`
                )
            ],
            components: []
        });
    }
}

/* =========================================================
   SETUP UPDATE
========================================================= */

async function showSetupFromUpdate(interaction) {
    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const row1 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("setup_automod")
                    .setLabel("AutoMod")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("setup_logs")
                    .setLabel("Logging")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("setup_staff")
                    .setLabel("Staff Role")
                    .setStyle(ButtonStyle.Secondary)
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("setup_refresh")
                    .setLabel("Refresh")
                    .setStyle(ButtonStyle.Secondary)
            );

    return interaction.update({
        embeds: [
            makeEmbed(
                "Ghosty Setup",
                `Configure Ghosty using the buttons below.\n\n` +
                `### Security\n` +
                `**AutoMod:** ${data.automod.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                `**Honeypot:** ${data.honeypot.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                `**Verification:** ${data.verification.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n\n` +
                `### Server Configuration\n` +
                `**Logs:** ${data.logChannel ? `<#${data.logChannel}>` : "Not configured"}\n` +
                `**Staff Role:** ${data.staffRole ? `<@&${data.staffRole}>` : "Not configured"}\n` +
                `**Verification Channel:** ${data.verification.channel ? `<#${data.verification.channel}>` : "Not configured"}\n` +
                `**Verified Role:** ${data.verification.role ? `<@&${data.verification.role}>` : "Not configured"}\n\n` +
                `### Protection\n` +
                `**Spam:** ${data.automod.spam ? "Enabled" : "Disabled"}\n` +
                `**Mentions:** ${data.automod.mentions ? "Enabled" : "Disabled"}\n` +
                `**Invites:** ${data.automod.invites ? "Enabled" : "Disabled"}\n` +
                `**Caps:** ${data.automod.caps ? "Enabled" : "Disabled"}`
            )
        ],
        components: [
            row1,
            row2
        ]
    });
}

/* =========================================================
   VERIFY CHANNEL UPDATE
========================================================= */

async function showVerifyChannelUpdate(interaction) {
    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const channelMenu =
        new ChannelSelectMenuBuilder()
            .setCustomId("verify_setup_channel")
            .setPlaceholder("Set verification channel")
            .setChannelTypes(ChannelType.GuildText);

    const roleMenu =
        new RoleSelectMenuBuilder()
            .setCustomId("verify_setup_role")
            .setPlaceholder("Set verified role");

    const submit =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("verify_setup_submit")
                    .setLabel("Submit")
                    .setStyle(ButtonStyle.Success)
            );

    return interaction.update({
        embeds: [
            makeEmbed(
                "Verification Channel Setup",
                `**Channel:** ${data.verification.channel ? `<#${data.verification.channel}>` : "Not selected"}\n` +
                `**Verified Role:** ${data.verification.role ? `<@&${data.verification.role}>` : "Not selected"}\n\n` +
                `Select both options and press **Submit** to publish the verification panel.`
            )
        ],
        components: [
            new ActionRowBuilder().addComponents(channelMenu),
            new ActionRowBuilder().addComponents(roleMenu),
            submit
        ]
    });
}

/* =========================================================
   CHANNEL SELECT
========================================================= */

async function handleChannelSelect(interaction) {
    if (!isAdmin(interaction)) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "You need Administrator permissions."
                )
            ],
            ephemeral: true
        });
    }

    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const channelId =
        interaction.values[0];

    if (
        interaction.customId ===
        "select_honeypot_channel"
    ) {
        data.honeypot.channel =
            channelId;

        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Honeypot Channel Set",
                    `The honeypot channel is now <#${channelId}>.`
                )
            ],
            components: []
        });
    }

    if (
        interaction.customId ===
        "select_log_channel"
    ) {
        data.logChannel =
            channelId;

        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Logging Channel Set",
                    `Ghosty will now send logs to <#${channelId}>.`
                )
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("setup_refresh")
                            .setLabel("Back to Setup")
                            .setStyle(ButtonStyle.Secondary)
                    )
            ]
        });
    }

    if (
        interaction.customId ===
        "verify_setup_channel"
    ) {
        data.verification.channel =
            channelId;

        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Verification Channel Set",
                    `Verification will be published in <#${channelId}>.\n\n` +
                    `Now select the verified role and press **Submit**.`
                )
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new RoleSelectMenuBuilder()
                            .setCustomId("verify_setup_role")
                            .setPlaceholder("Set verified role")
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("verify_setup_submit")
                            .setLabel("Submit")
                            .setStyle(ButtonStyle.Success)
                    )
            ]
        });
    }
}

/* =========================================================
   ROLE SELECT
========================================================= */

async function handleRoleSelect(interaction) {
    if (!isAdmin(interaction)) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "You need Administrator permissions."
                )
            ],
            ephemeral: true
        });
    }

    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const roleId =
        interaction.values[0];

    if (
        interaction.customId ===
        "select_staff_role"
    ) {
        data.staffRole = roleId;

        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Staff Role Set",
                    `Ghosty's staff role is now <@&${roleId}>.`
                )
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("setup_refresh")
                            .setLabel("Back to Setup")
                            .setStyle(ButtonStyle.Secondary)
                    )
            ]
        });
    }

    if (
        interaction.customId ===
        "verify_setup_role"
    ) {
        data.verification.role =
            roleId;

        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Verified Role Set",
                    `The verified role is now <@&${roleId}>.\n\n` +
                    `Press **Submit** to publish the verification panel.`
                )
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId("verify_setup_channel")
                            .setPlaceholder("Set verification channel")
                            .setChannelTypes(ChannelType.GuildText)
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("verify_setup_submit")
                            .setLabel("Submit")
                            .setStyle(ButtonStyle.Success)
                    )
            ]
        });
    }
}

/* =========================================================
   STRING SELECT
========================================================= */

async function handleStringSelect(interaction) {
    if (!isAdmin(interaction)) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "You need Administrator permissions."
                )
            ],
            ephemeral: true
        });
    }

    if (
        interaction.customId !==
        "automod_toggle"
    ) {
        return;
    }

    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const option =
        interaction.values[0];

    if (
        ![
            "spam",
            "mentions",
            "invites",
            "caps"
        ].includes(option)
    ) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Invalid AutoMod option."
                )
            ],
            ephemeral: true
        });
    }

    data.automod[option] =
        !data.automod[option];

    saveData();

    return showAutoMod(interaction);
}

/* =========================================================
   MODAL HANDLER
========================================================= */

async function handleModal(interaction) {
    if (
        interaction.customId !==
        "verification_code_modal"
    ) {
        return;
    }

    const entered =
        interaction.fields
            .getTextInputValue(
                "verification_code"
            )
            .trim();

    const key =
        `${interaction.guild.id}:${interaction.user.id}`;

    const stored =
        verificationCodes.get(key);

    if (!stored) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "You do not have an active verification code. Please click the Verify button again."
                )
            ],
            ephemeral: true
        });
    }

    if (Date.now() > stored.expires) {
        verificationCodes.delete(key);

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Your verification code has expired. Please request a new code."
                )
            ],
            ephemeral: true
        });
    }

    if (entered !== stored.code) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "That verification code is incorrect. Please check the code and try again."
                )
            ],
            ephemeral: true
        });
    }

    const data = ensureGuildData(
        getGuildData(interaction.guild.id)
    );

    const member =
        await interaction.guild.members
            .fetch(interaction.user.id)
            .catch(() => null);

    if (!member) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "I could not find you in this server."
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
                    "The configured verified role no longer exists."
                )
            ],
            ephemeral: true
        });
    }

    if (!role.editable) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Ghosty cannot give the verified role. Make sure Ghosty's bot role is above the verified role."
                )
            ],
            ephemeral: true
        });
    }

    try {
        await member.roles.add(
            role,
            "Ghosty verification completed"
        );
    } catch (error) {
        console.error(
            "Verification role error:",
            error
        );

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "I could not give you the verified role. Check Ghosty's role hierarchy and permissions."
                )
            ],
            ephemeral: true
        });
    }

    verificationCodes.delete(key);

    await sendLog(
        interaction.guild,
        makeEmbed(
            "Member Verified",
            `**User:** ${interaction.user}\n` +
            `**User ID:** ${interaction.user.id}\n` +
            `**Verified Role:** ${role}\n` +
            `**Method:** Verification Code`
        )
    );

    return interaction.reply({
        embeds: [
            makeEmbed(
                "Verification Successful",
                `You have successfully verified in **${interaction.guild.name}**.\n\n` +
                `You have been given the ${role} role.`
            )
        ],
        ephemeral: true
    });
}

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
