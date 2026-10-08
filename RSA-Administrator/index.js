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
const SUPPORT_SERVER = "https://discord.gg/VyjrM6AXZ";

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
                verifiedRole: null,
                unverifiedRole: null,
                successful: 0,
                failed: 0
            },

            warnings: {},

            lockdown: {
                enabled: false,
                channels: {}
            }
        };

        saveData();
    }

    const data = guildData[guildId];

    /* Upgrade older guild data safely */

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
            verifiedRole: null,
            unverifiedRole: null,
            successful: 0,
            failed: 0
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
   VERIFICATION CODE STORAGE
========================================================= */

const verificationCodes = new Map();

function createVerificationCode(guildId, userId) {
    const code = Math.floor(
        100000 + Math.random() * 900000
    ).toString();

    verificationCodes.set(
        `${guildId}:${userId}`,
        {
            code,
            expires: Date.now() + 5 * 60 * 1000,
            attempts: 0
        }
    );

    return code;
}

function getVerificationCode(guildId, userId) {
    return verificationCodes.get(
        `${guildId}:${userId}`
    );
}

function deleteVerificationCode(guildId, userId) {
    verificationCodes.delete(
        `${guildId}:${userId}`
    );
}

/* Clean expired verification codes */

setInterval(() => {
    const now = Date.now();

    for (const [key, data] of verificationCodes.entries()) {
        if (data.expires <= now) {
            verificationCodes.delete(key);
        }
    }
}, 30000);

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
        .setDescription("Configure Ghosty."),

    /* SECURITY */

    new SlashCommandBuilder()
        .setName("honeypot")
        .setDescription("Configure the Ghosty honeypot.")
        .addStringOption(option =>
            option
                .setName("action")
                .setDescription("Enable or disable the honeypot.")
                .setRequired(true)
                .addChoices(
                    {
                        name: "Enable",
                        value: "enable"
                    },
                    {
                        name: "Disable",
                        value: "disable"
                    }
                )
        )
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Honeypot channel.")
                .addChannelTypes(ChannelType.GuildText)
        ),

    new SlashCommandBuilder()
        .setName("verification")
        .setDescription("Create a Ghosty verification panel.")
        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Optional verified role.")
        ),

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
        .setDescription("Get the Ghosty support server.")

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

    const data = getGuildData(interaction.guild.id);

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
    const data = getGuildData(guild.id);

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
   COMMAND REGISTRATION
========================================================= */

async function registerCommands() {
    try {
        if (!client.user) {
            return;
        }

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

    const data = getGuildData(message.guild.id);

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

        const previous =
            messageTracker.get(key) || [];

        const recent =
            previous.filter(
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
        const recent =
            timestamps.filter(
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

        if (interaction.isModalSubmit()) {
            await handleModal(interaction);
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
});

/* =========================================================
   COMMAND HANDLER
========================================================= */

async function handleCommand(interaction) {
    const command =
        interaction.commandName;

    const adminCommands = [
        "ghostysetup",
        "lockdown",
        "unlockdown",
        "honeypot",
        "verification"
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

        if (
            user.id === interaction.user.id
        ) {
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

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Timeout Removed",
                `**User:** ${user}\n` +
                `**Moderator:** ${interaction.user}`
            )
        );

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

        const data =
            getGuildData(interaction.guild.id);

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

        const text =
            warnings
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

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Warnings Cleared",
                `**User:** ${user}\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Removed:** ${count}`
            )
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Warnings Cleared",
                    `All warnings for ${user} have been removed.`
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

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Messages Purged",
                `**Channel:** ${interaction.channel}\n` +
                `**Deleted:** ${deleted.size}\n` +
                `**Moderator:** ${interaction.user}`
            )
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

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Channel Locked",
                `**Channel:** ${interaction.channel}\n` +
                `**Moderator:** ${interaction.user}`
            )
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

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Channel Unlocked",
                `**Channel:** ${interaction.channel}\n` +
                `**Moderator:** ${interaction.user}`
            )
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

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Server Lockdown",
                `Server lockdown activated.\n\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Channels Locked:** ${locked}`
            )
        );

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

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Lockdown Ended",
                `**Moderator:** ${interaction.user}\n` +
                `**Channels Restored:** ${restored}`
            )
        );

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
        const data =
            getGuildData(interaction.guild.id);

        const action =
            interaction.options.getString("action");

        const channel =
            interaction.options.getChannel("channel");

        if (action === "enable") {
            if (channel) {
                data.honeypot.channel =
                    channel.id;
            }

            if (!data.honeypot.channel) {
                return interaction.reply({
                    embeds: [
                        errorEmbed(
                            "You need to select a honeypot channel."
                        )
                    ],
                    ephemeral: true
                });
            }

            data.honeypot.enabled = true;

            saveData();

            await sendLog(
                interaction.guild,
                makeEmbed(
                    "Honeypot Enabled",
                    `**Channel:** <#${data.honeypot.channel}>\n` +
                    `**Moderator:** ${interaction.user}`
                )
            );

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "Honeypot Enabled",
                        `The honeypot is now active in <#${data.honeypot.channel}>.\n\n` +
                        `Members who send a message there will automatically be removed if Ghosty can kick them.`
                    )
                ],
                ephemeral: true
            });
        }

        data.honeypot.enabled = false;

        saveData();

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Honeypot Disabled",
                    "The Ghosty honeypot has been disabled."
                )
            ],
            ephemeral: true
        });
    }

    /* VERIFICATION PANEL */

    if (command === "verification") {
        const data =
            getGuildData(interaction.guild.id);

        const suppliedRole =
            interaction.options.getRole("role");

        if (suppliedRole) {
            data.verification.verifiedRole =
                suppliedRole.id;
            saveData();
        }

        if (!data.verification.verifiedRole) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "No verified role is configured. Use `/ghostysetup` and configure Verification first, or provide a role with this command."
                    )
                ],
                ephemeral: true
            });
        }

        if (!data.verification.enabled) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Verification is currently disabled. Enable it through `/ghostysetup` first."
                    )
                ],
                ephemeral: true
            });
        }

        data.verification.channel =
            interaction.channel.id;

        saveData();

        const button =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "verification_start"
                        )
                        .setLabel(
                            "Start Verification"
                        )
                        .setEmoji("🔐")
                        .setStyle(
                            ButtonStyle.Primary
                        )
                );

        return interaction.channel.send({
            embeds: [
                makeEmbed(
                    "🛡️ Ghosty Verification",
                    `Welcome to **${interaction.guild.name}**.\n\n` +
                    `Before accessing the server, you must complete verification.\n\n` +
                    `Click **Start Verification** below and Ghosty will generate a unique **6-digit verification code** for you.\n\n` +
                    `Your code will expire after **5 minutes** and you have a maximum of **5 attempts**.\n\n` +
                    `**Do not share your verification code with anyone.**`
                )
            ],
            components: [button]
        }).then(async () => {
            await interaction.reply({
                embeds: [
                    makeEmbed(
                        "Verification Panel Created",
                        `The verification panel has been posted in ${interaction.channel}.`
                    )
                ],
                ephemeral: true
            });
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

        const roles =
            member
                ? member.roles.cache
                    .filter(
                        role =>
                            role.id !==
                            interaction.guild.id
                    )
                    .sort(
                        (a, b) =>
                            b.position - a.position
                    )
                    .map(role =>
                        role.toString()
                    )
                    .join(", ") || "None"
                : "Not a member";

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "User Information",
                    `**Username:** ${user.tag}\n` +
                    `**ID:** ${user.id}\n` +
                    `**Bot:** ${user.bot ? "Yes" : "No"}\n` +
                    `**Created:** <t:${Math.floor(
                        user.createdTimestamp / 1000
                    )}:F>\n\n` +
                    `**Server Member:** ${member ? "Yes" : "No"}\n` +
                    `**Joined:** ${
                        member?.joinedTimestamp
                            ? `<t:${Math.floor(
                                member.joinedTimestamp /
                                1000
                            )}:F>`
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
        const guild =
            interaction.guild;

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
                    `**Mentionable:** ${role.mentionable ? "Yes" : "No"}\n` +
                    `**Hoisted:** ${role.hoist ? "Yes" : "No"}\n` +
                    `**Managed:** ${role.managed ? "Yes" : "No"}\n` +
                    `**Created:** <t:${Math.floor(
                        role.createdTimestamp / 1000
                    )}:F>`
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
                    `**Category:** ${channel.parent?.name || "None"}\n` +
                    `**Position:** ${channel.position}\n` +
                    `**Slowmode:** ${
                        "rateLimitPerUser" in channel
                            ? `${channel.rateLimitPerUser}s`
                            : "Unavailable"
                    }\n` +
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
                    .setTitle(
                        `${user.tag}'s Avatar`
                    )
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
                    `/ghostysetup\n\n` +
                    `**Security**\n` +
                    `/honeypot\n/verification\n\n` +
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
                    `**Version:** 1.2.0\n` +
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
                    `Join the official Ghosty support server:\n\n` +
                    `[**Join Ghosty Support**](${SUPPORT_SERVER})`
                )
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   GHOSTY SETUP
========================================================= */

async function showSetup(interaction) {
    const data =
        getGuildData(interaction.guild.id);

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId("ghosty_setup_menu")
            .setPlaceholder(
                "Choose a Ghosty configuration"
            )
            .addOptions(
                {
                    label: "AutoMod",
                    description:
                        "Configure Ghosty's AutoMod protection.",
                    value: "automod",
                    emoji: "🛡️"
                },
                {
                    label: "Honeypot",
                    description:
                        "Configure the honeypot protection.",
                    value: "honeypot",
                    emoji: "🍯"
                },
                {
                    label: "Logging",
                    description:
                        "Choose the Ghosty logging channel.",
                    value: "logging",
                    emoji: "📋"
                },
                {
                    label: "Staff Role",
                    description:
                        "Choose the role treated as Ghosty staff.",
                    value: "staff",
                    emoji: "👮"
                },
                {
                    label: "Verification",
                    description:
                        "Configure code-based verification.",
                    value: "verification",
                    emoji: "🔐"
                }
            );

    return interaction.reply({
        embeds: [
            makeEmbed(
                "Ghosty Setup",
                `Configure Ghosty for **${interaction.guild.name}**.\n\n` +
                `**AutoMod:** ${data.automod.enabled ? "Enabled" : "Disabled"}\n` +
                `**Honeypot:** ${data.honeypot.enabled ? "Enabled" : "Disabled"}\n` +
                `**Logging:** ${data.logChannel ? `<#${data.logChannel}>` : "Not configured"}\n` +
                `**Staff Role:** ${data.staffRole ? `<@&${data.staffRole}>` : "Not configured"}\n` +
                `**Verification:** ${data.verification.enabled ? "Enabled" : "Disabled"}\n` +
                `**Verified Role:** ${data.verification.verifiedRole ? `<@&${data.verification.verifiedRole}>` : "Not configured"}\n` +
                `**Lockdown:** ${data.lockdown.enabled ? "Active" : "Inactive"}\n\n` +
                `Select a section below to configure Ghosty.`
            )
        ],
        components: [
            new ActionRowBuilder().addComponents(menu)
        ],
        ephemeral: true
    });
}

/* =========================================================
   AUTOMOD SETUP
========================================================= */

async function showAutoModSetup(interaction) {
    const data =
        getGuildData(interaction.guild.id);

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "automod_enable"
                    )
                    .setLabel("Enable")
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "automod_disable"
                    )
                    .setLabel("Disable")
                    .setStyle(
                        ButtonStyle.Danger
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "automod_options"
                    )
                    .setLabel("Protection Options")
                    .setStyle(
                        ButtonStyle.Primary
                    )
            );

    return interaction.update({
        embeds: [
            makeEmbed(
                "AutoMod Configuration",
                `**Status:** ${data.automod.enabled ? "Enabled" : "Disabled"}\n\n` +
                `**Spam:** ${data.automod.spam ? "Enabled" : "Disabled"}\n` +
                `**Mentions:** ${data.automod.mentions ? "Enabled" : "Disabled"}\n` +
                `**Invites:** ${data.automod.invites ? "Enabled" : "Disabled"}\n` +
                `**Caps:** ${data.automod.caps ? "Enabled" : "Disabled"}`
            )
        ],
        components: [row]
    });
}

/* =========================================================
   BUTTON HANDLER
========================================================= */

async function handleButton(interaction) {

    /* Verification button is available to everyone */

    if (
        interaction.customId ===
        "verification_start"
    ) {
        return startVerification(
            interaction
        );
    }

    /* Everything else is admin-only */

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

    const data =
        getGuildData(interaction.guild.id);

    const id =
        interaction.customId;

    /* AUTOMOD */

    if (id === "automod_enable") {
        data.automod.enabled = true;
        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "AutoMod Enabled",
                    "Ghosty's AutoMod is now enabled."
                )
            ],
            components: []
        });
    }

    if (id === "automod_disable") {
        data.automod.enabled = false;
        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "AutoMod Disabled",
                    "Ghosty's AutoMod is now disabled."
                )
            ],
            components: []
        });
    }

    if (id === "automod_options") {
        const menu =
            new StringSelectMenuBuilder()
                .setCustomId(
                    "automod_toggle"
                )
                .setPlaceholder(
                    "Select a protection"
                )
                .addOptions(
                    {
                        label: "Spam Protection",
                        value: "spam",
                        emoji: "💬"
                    },
                    {
                        label: "Mention Protection",
                        value: "mentions",
                        emoji: "📢"
                    },
                    {
                        label: "Invite Protection",
                        value: "invites",
                        emoji: "🔗"
                    },
                    {
                        label: "Caps Protection",
                        value: "caps",
                        emoji: "🔠"
                    }
                );

        return interaction.update({
            embeds: [
                makeEmbed(
                    "AutoMod Protection Options",
                    `**Spam:** ${data.automod.spam ? "Enabled" : "Disabled"}\n` +
                    `**Mentions:** ${data.automod.mentions ? "Enabled" : "Disabled"}\n` +
                    `**Invites:** ${data.automod.invites ? "Enabled" : "Disabled"}\n` +
                    `**Caps:** ${data.automod.caps ? "Enabled" : "Disabled"}\n\n` +
                    `Select a protection below to toggle it.`
                )
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    menu
                )
            ]
        });
    }

    /* HONEYPOT SETUP */

    if (id === "setup_honeypot_enable") {
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
                    `The honeypot is active in <#${data.honeypot.channel}>.`
                )
            ],
            components: []
        });
    }

    if (id === "setup_honeypot_disable") {
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
        if (!data.verification.verifiedRole) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Select a verified role before enabling verification."
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
                    "Code-based verification is now enabled."
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
                    "Code-based verification has been disabled."
                )
            ],
            components: []
        });
    }

    if (id === "verification_send_panel") {
        if (!data.verification.verifiedRole) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Configure a verified role first."
                    )
                ],
                ephemeral: true
            });
        }

        const channel =
            data.verification.channel
                ? interaction.guild.channels.cache.get(
                    data.verification.channel
                )
                : interaction.channel;

        if (!channel || !channel.isTextBased()) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "The configured verification channel could not be found."
                    )
                ],
                ephemeral: true
            });
        }

        const button =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "verification_start"
                        )
                        .setLabel(
                            "Start Verification"
                        )
                        .setEmoji("🔐")
                        .setStyle(
                            ButtonStyle.Primary
                        )
                );

        await channel.send({
            embeds: [
                makeEmbed(
                    "🛡️ Ghosty Verification",
                    `Welcome to **${interaction.guild.name}**.\n\n` +
                    `To gain access to the server, you must complete verification.\n\n` +
                    `Click **Start Verification** and Ghosty will give you a unique **6-digit code**.\n\n` +
                    `Your code expires after **5 minutes** and you have **5 attempts**.\n\n` +
                    `**Never share your verification code with anyone.**`
                )
            ],
            components: [button]
        });

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Verification Panel Sent",
                    `The verification panel has been sent to ${channel}.`
                )
            ],
            components: []
        });
    }
}

/* =========================================================
   START VERIFICATION
========================================================= */

async function startVerification(interaction) {
    const data =
        getGuildData(interaction.guild.id);

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

    if (!data.verification.verifiedRole) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "The server has not configured a verified role yet."
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
                    "Ghosty could not find you as a server member."
                )
            ],
            ephemeral: true
        });
    }

    if (
        member.roles.cache.has(
            data.verification.verifiedRole
        )
    ) {
        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Already Verified",
                    "You are already verified in this server."
                )
            ],
            ephemeral: true
        });
    }

    const code =
        createVerificationCode(
            interaction.guild.id,
            interaction.user.id
        );

    const expires =
        Math.floor(
            (Date.now() + 5 * 60 * 1000) / 1000
        );

    const modal =
        new ModalBuilder()
            .setCustomId(
                "verification_modal"
            )
            .setTitle(
                "Ghosty Verification"
            );

    const codeInput =
        new TextInputBuilder()
            .setCustomId(
                "verification_code"
            )
            .setLabel(
                "Enter your 6-digit verification code"
            )
            .setPlaceholder(
                "Example: 482731"
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6);

    modal.addComponents(
        new ActionRowBuilder().addComponents(
            codeInput
        )
    );

    await interaction.showModal(modal);

    /*
       Send the code after a very short delay so the modal
       has time to open cleanly.
    */

    setTimeout(async () => {
        try {
            await interaction.followUp({
                embeds: [
                    makeEmbed(
                        "🔐 Your Verification Code",
                        `Your verification code is:\n\n` +
                        `# \`${code}\`\n\n` +
                        `Enter this code in the verification box.\n\n` +
                        `**Expires:** <t:${expires}:R>\n` +
                        `**Attempts:** 5`
                    )
                ],
                ephemeral: true
            });
        } catch {
            /* User may have closed the interaction. */
        }
    }, 400);
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
        getGuildData(interaction.guild.id);

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

    const verification =
        getVerificationCode(
            interaction.guild.id,
            interaction.user.id
        );

    if (!verification) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Your verification code has expired or does not exist. Click **Start Verification** to receive a new code."
                )
            ],
            ephemeral: true
        });
    }

    if (
        verification.expires <=
        Date.now()
    ) {
        deleteVerificationCode(
            interaction.guild.id,
            interaction.user.id
        );

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Your verification code has expired. Please start verification again."
                )
            ],
            ephemeral: true
        });
    }

    const entered =
        interaction.fields
            .getTextInputValue(
                "verification_code"
            )
            .trim();

    verification.attempts++;

    if (
        entered !== verification.code
    ) {
        if (
            verification.attempts >= 5
        ) {
            deleteVerificationCode(
                interaction.guild.id,
                interaction.user.id
            );

            data.verification.failed++;
            saveData();

            await sendLog(
                interaction.guild,
                makeEmbed(
                    "Verification Failed",
                    `A member used all verification attempts.\n\n` +
                    `**User:** ${interaction.user}\n` +
                    `**User ID:** ${interaction.user.id}\n` +
                    `**Result:** Failed`
                )
            );

            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You entered the wrong code too many times. Start verification again to receive a new code."
                    )
                ],
                ephemeral: true
            });
        }

        const remaining =
            5 - verification.attempts;

        return interaction.reply({
            embeds: [
                errorEmbed(
                    `That code is incorrect.\n\nYou have **${remaining} attempt(s)** remaining.`
                )
            ],
            ephemeral: true
        });
    }

    deleteVerificationCode(
        interaction.guild.id,
        interaction.user.id
    );

    const member =
        await interaction.guild.members
            .fetch(interaction.user.id)
            .catch(() => null);

    if (!member) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Ghosty could not find your server membership."
                )
            ],
            ephemeral: true
        });
    }

    const role =
        interaction.guild.roles.cache.get(
            data.verification.verifiedRole
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

    if (
        role.position >=
        interaction.guild.members.me.roles.highest.position
    ) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Ghosty cannot give you the verified role because the role is higher than or equal to Ghosty's highest role."
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

        if (
            data.verification.unverifiedRole
        ) {
            const unverified =
                interaction.guild.roles.cache.get(
                    data.verification.unverifiedRole
                );

            if (
                unverified &&
                member.roles.cache.has(
                    unverified.id
                )
            ) {
                await member.roles.remove(
                    unverified,
                    "Ghosty verification completed"
                ).catch(() => {});
            }
        }

        data.verification.successful++;

        saveData();

        await sendLog(
            interaction.guild,
            makeEmbed(
                "Member Verified",
                `A member successfully completed Ghosty verification.\n\n` +
                `**User:** ${interaction.user}\n` +
                `**User ID:** ${interaction.user.id}\n` +
                `**Verified Role:** ${role}\n` +
                `**Result:** Successful`
            )
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "✅ Verification Complete",
                    `You have successfully verified in **${interaction.guild.name}**.\n\n` +
                    `You now have access to the verified areas of the server.`
                )
            ],
            ephemeral: true
        });
    } catch (error) {
        console.error(
            "Verification role error:",
            error
        );

        return interaction.reply({
            embeds: [
                errorEmbed(
                    "Ghosty could not give you the verified role. Please contact a server administrator."
                )
            ],
            ephemeral: true
        });
    }
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

    const data =
        getGuildData(interaction.guild.id);

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
            components: []
        });
    }

    if (
        interaction.customId ===
        "select_verification_channel"
    ) {
        data.verification.channel =
            channelId;

        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Verification Channel Set",
                    `The verification channel is now <#${channelId}>.`
                )
            ],
            components: []
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

    const data =
        getGuildData(interaction.guild.id);

    const roleId =
        interaction.values[0];

    if (
        interaction.customId ===
        "select_staff_role"
    ) {
        data.staffRole =
            roleId;

        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Staff Role Set",
                    `Ghosty's staff role is now <@&${roleId}>.`
                )
            ],
            components: []
        });
    }

    if (
        interaction.customId ===
        "select_verified_role"
    ) {
        data.verification.verifiedRole =
            roleId;

        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Verified Role Set",
                    `Members who complete verification will receive <@&${roleId}>.`
                )
            ],
            components: []
        });
    }

    if (
        interaction.customId ===
        "select_unverified_role"
    ) {
        data.verification.unverifiedRole =
            roleId;

        saveData();

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Unverified Role Set",
                    `The unverified role is now <@&${roleId}>.`
                )
            ],
            components: []
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

    /* MAIN SETUP MENU */

    if (
        interaction.customId ===
        "ghosty_setup_menu"
    ) {
        const option =
            interaction.values[0];

        if (option === "automod") {
            return showAutoModSetup(
                interaction
            );
        }

        if (option === "honeypot") {
            const data =
                getGuildData(
                    interaction.guild.id
                );

            const menu =
                new ChannelSelectMenuBuilder()
                    .setCustomId(
                        "select_honeypot_channel"
                    )
                    .setPlaceholder(
                        "Select honeypot channel"
                    )
                    .setChannelTypes(
                        ChannelType.GuildText
                    );

            const buttons =
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                "setup_honeypot_enable"
                            )
                            .setLabel(
                                "Enable"
                            )
                            .setStyle(
                                ButtonStyle.Success
                            ),

                        new ButtonBuilder()
                            .setCustomId(
                                "setup_honeypot_disable"
                            )
                            .setLabel(
                                "Disable"
                            )
                            .setStyle(
                                ButtonStyle.Danger
                            )
                    );

            return interaction.update({
                embeds: [
                    makeEmbed(
                        "Honeypot Configuration",
                        `**Status:** ${data.honeypot.enabled ? "Enabled" : "Disabled"}\n` +
                        `**Channel:** ${data.honeypot.channel ? `<#${data.honeypot.channel}>` : "Not configured"}\n` +
                        `**Kicks:** ${data.honeypot.kicks}\n\n` +
                        `Select the honeypot channel, then enable the protection.`
                    )
                ],
                components: [
                    new ActionRowBuilder().addComponents(
                        menu
                    ),
                    buttons
                ]
            });
        }

        if (option === "logging") {
            const menu =
                new ChannelSelectMenuBuilder()
                    .setCustomId(
                        "select_log_channel"
                    )
                    .setPlaceholder(
                        "Select the logging channel"
                    )
                    .setChannelTypes(
                        ChannelType.GuildText
                    );

            return interaction.update({
                embeds: [
                    makeEmbed(
                        "Logging Configuration",
                        "Select the channel Ghosty should use for moderation and security logs."
                    )
                ],
                components: [
                    new ActionRowBuilder().addComponents(
                        menu
                    )
                ]
            });
        }

        if (option === "staff") {
            const menu =
                new RoleSelectMenuBuilder()
                    .setCustomId(
                        "select_staff_role"
                    )
                    .setPlaceholder(
                        "Select the Ghosty staff role"
                    );

            return interaction.update({
                embeds: [
                    makeEmbed(
                        "Staff Role Configuration",
                        "Select the role that should be treated as Ghosty staff."
                    )
                ],
                components: [
                    new ActionRowBuilder().addComponents(
                        menu
                    )
                ]
            });
        }

        if (option === "verification") {
            return showVerificationSetup(
                interaction
            );
        }

        return;
    }

    /* AUTOMOD TOGGLE */

    if (
        interaction.customId !==
        "automod_toggle"
    ) {
        return;
    }

    const data =
        getGuildData(
            interaction.guild.id
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

    const names = {
        spam: "Spam Protection",
        mentions: "Mention Protection",
        invites: "Invite Protection",
        caps: "Caps Protection"
    };

    return interaction.update({
        embeds: [
            makeEmbed(
                "AutoMod Updated",
                `**${names[option]}** is now **${
                    data.automod[option]
                        ? "Enabled"
                        : "Disabled"
                }**.`
            )
        ],
        components: []
    });
}

/* =========================================================
   VERIFICATION SETUP
========================================================= */

async function showVerificationSetup(interaction) {
    const data =
        getGuildData(
            interaction.guild.id
        );

    const verifiedRoleMenu =
        new RoleSelectMenuBuilder()
            .setCustomId(
                "select_verified_role"
            )
            .setPlaceholder(
                "Select the verified role"
            );

    const unverifiedRoleMenu =
        new RoleSelectMenuBuilder()
            .setCustomId(
                "select_unverified_role"
            )
            .setPlaceholder(
                "Select the unverified role (optional)"
            );

    const channelMenu =
        new ChannelSelectMenuBuilder()
            .setCustomId(
                "select_verification_channel"
            )
            .setPlaceholder(
                "Select verification channel"
            )
            .setChannelTypes(
                ChannelType.GuildText
            );

    const buttons =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "verification_enable"
                    )
                    .setLabel("Enable")
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "verification_disable"
                    )
                    .setLabel("Disable")
                    .setStyle(
                        ButtonStyle.Danger
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "verification_send_panel"
                    )
                    .setLabel(
                        "Send Panel"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    )
            );

    return interaction.update({
        embeds: [
            makeEmbed(
                "🔐 Verification Configuration",
                `**Status:** ${data.verification.enabled ? "Enabled" : "Disabled"}\n` +
                `**Verification Channel:** ${data.verification.channel ? `<#${data.verification.channel}>` : "Not configured"}\n` +
                `**Verified Role:** ${data.verification.verifiedRole ? `<@&${data.verification.verifiedRole}>` : "Not configured"}\n` +
                `**Unverified Role:** ${data.verification.unverifiedRole ? `<@&${data.verification.unverifiedRole}>` : "Not configured"}\n\n` +
                `Members receive a unique 6-digit code when they begin verification.\n\n` +
                `**Code Expiry:** 5 minutes\n` +
                `**Maximum Attempts:** 5\n` +
                `**Successful Verifications:** ${data.verification.successful}\n` +
                `**Failed Verifications:** ${data.verification.failed}`
            )
        ],
        components: [
            new ActionRowBuilder().addComponents(
                verifiedRoleMenu
            ),
            new ActionRowBuilder().addComponents(
                unverifiedRoleMenu
            ),
            new ActionRowBuilder().addComponents(
                channelMenu
            ),
            buttons
        ]
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
