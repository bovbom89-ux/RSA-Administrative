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
    fs.mkdirSync(DATA_DIR, {
        recursive: true
    });
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
    console.error(
        "Could not load guild data:",
        error
    );

    guildData = {};
}

function saveData() {
    try {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(guildData, null, 4)
        );
    } catch (error) {
        console.error(
            "Could not save guild data:",
            error
        );
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

            warnings: {},

            lockdown: {
                enabled: false,
                channels: {}
            }
        });

        saveData();
    }

    return guildData[guildId];
}

/* =========================================================
   EMBEDS
========================================================= */

function embed(title, description) {
    return new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle(title)
        .setDescription(description);
}

function successEmbed(title, description) {
    return embed(title, description);
}

function errorEmbed(description) {
    return embed(
        "Action Failed",
        description
    );
}

/* =========================================================
   COMMANDS
========================================================= */

const commands = [
    /* ---------------- MODERATION ---------------- */

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
                .setDescription("The user's Discord ID.")
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
                .setDescription("Timeout duration in minutes.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the timeout.")
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove a member's timeout.")
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
                .setDescription("Reason for the warning.")
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

    /* ---------------- CHANNEL MANAGEMENT ---------------- */

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete messages from the current channel.")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Number of messages to delete.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Change the current channel's slowmode.")
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription("Slowmode duration in seconds.")
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
        .setDescription("Lock all text channels in the server."),

    new SlashCommandBuilder()
        .setName("unlockdown")
        .setDescription("End the active server lockdown."),

    /* ---------------- CONFIGURATION ---------------- */

    new SlashCommandBuilder()
        .setName("ghostysetup")
        .setDescription("Configure Ghosty for this server."),

    new SlashCommandBuilder()
        .setName("settings")
        .setDescription("View Ghosty's current configuration."),

    new SlashCommandBuilder()
        .setName("automodconfig")
        .setDescription("Configure Ghosty's AutoMod."),

    new SlashCommandBuilder()
        .setName("logs")
        .setDescription("Configure Ghosty's logging channel."),

    /* ---------------- INFORMATION ---------------- */

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("View detailed information about a user.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to inspect.")
        ),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("View detailed information about the server."),

    new SlashCommandBuilder()
        .setName("roleinfo")
        .setDescription("View information about a role.")
        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Role to inspect.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("channelinfo")
        .setDescription("View information about the current channel."),

    new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("View a user's avatar.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User.")
        ),

    new SlashCommandBuilder()
        .setName("banner")
        .setDescription("View a user's profile banner.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User.")
        ),

    /* ---------------- UTILITY ---------------- */

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
        .setDescription("View information about Ghosty."),

    new SlashCommandBuilder()
        .setName("invite")
        .setDescription("Get Ghosty's invite link."),

    new SlashCommandBuilder()
        .setName("support")
        .setDescription("Get Ghosty's support information.")
].map(command => command.toJSON());

/* =========================================================
   DUPLICATE COMMAND CHECK
========================================================= */

const commandNames = commands.map(
    command => command.name
);

const duplicateCommands = commandNames.filter(
    (name, index) =>
        commandNames.indexOf(name) !== index
);

if (duplicateCommands.length > 0) {
    console.error(
        "DUPLICATE COMMANDS FOUND:",
        [...new Set(duplicateCommands)]
    );

    process.exit(1);
}

console.log(
    `Loaded ${commands.length} unique commands.`
);

/* =========================================================
   REGISTER COMMANDS
========================================================= */

async function registerCommands() {
    try {
        const application =
            await client.application.fetch();

        const rest = new REST({
            version: "10"
        }).setToken(
            process.env.DISCORD_TOKEN
        );

        await rest.put(
            Routes.applicationCommands(
                application.id
            ),
            {
                body: commands
            }
        );

        console.log(
            `Registered ${commands.length} slash commands.`
        );
    } catch (error) {
        console.error(
            "Command registration failed:",
            error
        );
    }
}

/* =========================================================
   PERMISSIONS
========================================================= */

function hasPermission(
    interaction,
    permission
) {
    return interaction.memberPermissions?.has(
        permission
    );
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

    const data = getGuildData(
        interaction.guild.id
    );

    if (
        data.staffRole &&
        interaction.member?.roles?.cache?.has(
            data.staffRole
        )
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

async function sendLog(
    guild,
    logEmbed,
    components = []
) {
    const data =
        getGuildData(guild.id);

    if (!data.logChannel) {
        return;
    }

    const channel =
        guild.channels.cache.get(
            data.logChannel
        );

    if (
        !channel ||
        !channel.isTextBased()
    ) {
        return;
    }

    await channel.send({
        embeds: [logEmbed],
        components
    }).catch(() => {});
}

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
   MESSAGE TRACKING
========================================================= */

const messageTracker = new Map();

/* =========================================================
   MESSAGE CREATE
========================================================= */

client.on(
    "messageCreate",
    async message => {
        if (!message.guild) {
            return;
        }

        if (message.author.bot) {
            return;
        }

        const data =
            getGuildData(
                message.guild.id
            );

        /* ---------------- HONEYPOT ---------------- */

        if (
            data.honeypot.enabled &&
            data.honeypot.channel ===
                message.channel.id
        ) {
            await message.delete().catch(() => {});

            const member =
                message.member;

            if (!member) {
                return;
            }

            const protectedMember =
                member.permissions.has(
                    PermissionsBitField.Flags.Administrator
                ) ||
                (
                    data.staffRole &&
                    member.roles.cache.has(
                        data.staffRole
                    )
                );

            if (
                protectedMember ||
                !member.kickable
            ) {
                await sendLog(
                    message.guild,
                    embed(
                        "Honeypot Triggered",
                        `A message was detected in the honeypot channel, but Ghosty could not remove the member.\n\n` +
                        `**User:** ${message.author}\n` +
                        `**User ID:** ${message.author.id}\n` +
                        `**Channel:** ${message.channel}`
                    )
                );

                return;
            }

            const kicked =
                await member.kick(
                    "Ghosty Honeypot"
                )
                .then(() => true)
                .catch(() => false);

            if (!kicked) {
                await sendLog(
                    message.guild,
                    embed(
                        "Honeypot Triggered",
                        `Ghosty detected a honeypot trigger but could not kick the member.\n\n` +
                        `**User:** ${message.author}\n` +
                        `**User ID:** ${message.author.id}\n` +
                        `**Channel:** ${message.channel}`
                    )
                );

                return;
            }

            data.honeypot.kicks++;

            saveData();

            const counter =
                new ButtonBuilder()
                    .setCustomId(
                        "honeypot_kicks"
                    )
                    .setLabel(
                        `Kicks: ${data.honeypot.kicks}`
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
                    .setDisabled(true);

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        counter
                    );

            await sendLog(
                message.guild,
                embed(
                    "Honeypot Triggered",
                    `A member was automatically removed for sending a message in the honeypot channel.\n\n` +
                    `**User:** ${message.author}\n` +
                    `**User ID:** ${message.author.id}\n` +
                    `**Channel:** ${message.channel}\n` +
                    `**Action:** Kick`
                ),
                [row]
            );

            return;
        }

        /* ---------------- AUTOMOD ---------------- */

        if (!data.automod.enabled) {
            return;
        }

        let violation = null;

        /* Invite protection */

        if (
            data.automod.invites &&
            /(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)/i.test(
                message.content
            )
        ) {
            violation =
                "Discord invite links are not allowed.";
        }

        /* Mention protection */

        if (
            !violation &&
            data.automod.mentions &&
            message.mentions.users.size >= 6
        ) {
            violation =
                "Excessive mentions detected.";
        }

        /* Caps protection */

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
                letters ===
                    letters.toUpperCase()
            ) {
                violation =
                    "Excessive capital letters detected.";
            }
        }

        /* Spam protection */

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
                        now - timestamp <
                        5000
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
            embed(
                "AutoMod Action",
                `Ghosty removed a message for violating AutoMod.\n\n` +
                `**User:** ${message.author}\n` +
                `**User ID:** ${message.author.id}\n` +
                `**Channel:** ${message.channel}\n` +
                `**Reason:** ${violation}`
            )
        );
    }
);

/* =========================================================
   CLEAN MESSAGE TRACKER
========================================================= */

setInterval(
    () => {
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
                        now - timestamp <
                        5000
                );

            if (recent.length === 0) {
                messageTracker.delete(
                    key
                );
            } else {
                messageTracker.set(
                    key,
                    recent
                );
            }
        }
    },
    30000
);

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
                interaction.isChannelSelectMenu()
            ) {
                await handleChannelSelect(
                    interaction
                );

                return;
            }

            if (
                interaction.isRoleSelectMenu()
            ) {
                await handleRoleSelect(
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
   COMMAND HANDLER
========================================================= */

async function handleCommand(
    interaction
) {
    const command =
        interaction.commandName;

    const adminCommands = [
        "ghostysetup",
        "settings",
        "automodconfig",
        "logs",
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

    if (
        adminCommands.includes(
            command
        )
    ) {
        if (
            !(await requireAdmin(
                interaction
            ))
        ) {
            return;
        }
    }

    if (
        staffCommands.includes(
            command
        )
    ) {
        if (
            !(await requireStaff(
                interaction
            ))
        ) {
            return;
        }
    }

    /* =====================================================
       BAN
    ===================================================== */

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
            interaction.options.getUser(
                "user"
            );

        const reason =
            interaction.options.getString(
                "reason"
            ) ||
            "No reason provided.";

        if (
            user.id ===
            interaction.user.id
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

        if (
            !member ||
            !member.bannable
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Ghosty cannot ban that member. Check the bot's role hierarchy and permissions."
                    )
                ],
                ephemeral: true
            });
        }

        await member.ban({
            reason
        });

        await sendLog(
            interaction.guild,
            embed(
                "Member Banned",
                `**User:** ${user}\n` +
                `**User ID:** ${user.id}\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Reason:** ${reason}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Member Banned",
                    `${user} has been permanently banned from the server.\n\n` +
                    `**User ID:** ${user.id}\n` +
                    `**Moderator:** ${interaction.user}\n` +
                    `**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       UNBAN
    ===================================================== */

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
            interaction.options.getString(
                "userid"
            );

        try {
            await interaction.guild.members.unban(
                userId
            );

            await sendLog(
                interaction.guild,
                embed(
                    "User Unbanned",
                    `**User ID:** ${userId}\n` +
                    `**Moderator:** ${interaction.user}`
                )
            );

            return interaction.reply({
                embeds: [
                    successEmbed(
                        "User Unbanned",
                        `User ID **${userId}** has been unbanned.\n\n` +
                        `**Moderator:** ${interaction.user}`
                    )
                ],
                ephemeral: true
            });
        } catch {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "That user could not be unbanned. Check that the ID is correct and that the user is currently banned."
                    )
                ],
                ephemeral: true
            });
        }
    }

    /* =====================================================
       KICK
    ===================================================== */

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
            interaction.options.getUser(
                "user"
            );

        const reason =
            interaction.options.getString(
                "reason"
            ) ||
            "No reason provided.";

        if (
            user.id ===
            interaction.user.id
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You cannot kick yourself."
                    )
                ],
                ephemeral: true
            });
        }

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !member.kickable
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Ghosty cannot kick that member. Check the bot's role hierarchy and permissions."
                    )
                ],
                ephemeral: true
            });
        }

        await member.kick(reason);

        await sendLog(
            interaction.guild,
            embed(
                "Member Kicked",
                `**User:** ${user}\n` +
                `**User ID:** ${user.id}\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Reason:** ${reason}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Member Kicked",
                    `${user} has been kicked from the server.\n\n` +
                    `**User ID:** ${user.id}\n` +
                    `**Moderator:** ${interaction.user}\n` +
                    `**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       TIMEOUT
    ===================================================== */

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
            interaction.options.getUser(
                "user"
            );

        const minutes =
            interaction.options.getInteger(
                "minutes"
            );

        const reason =
            interaction.options.getString(
                "reason"
            ) ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !member.moderatable
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Ghosty cannot timeout that member. Check the bot's role hierarchy and permissions."
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
            embed(
                "Member Timed Out",
                `**User:** ${user}\n` +
                `**User ID:** ${user.id}\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Duration:** ${minutes} minute(s)\n` +
                `**Reason:** ${reason}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Member Timed Out",
                    `${user} has been timed out.\n\n` +
                    `**Duration:** ${minutes} minute(s)\n` +
                    `**Moderator:** ${interaction.user}\n` +
                    `**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       UNTIMEOUT
    ===================================================== */

    if (command === "untimeout") {
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
            interaction.options.getUser(
                "user"
            );

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !member.moderatable
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Ghosty cannot modify that member. Check the bot's role hierarchy."
                    )
                ],
                ephemeral: true
            });
        }

        await member.timeout(null);

        await sendLog(
            interaction.guild,
            embed(
                "Timeout Removed",
                `**User:** ${user}\n` +
                `**Moderator:** ${interaction.user}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Timeout Removed",
                    `The timeout has been removed from ${user}.\n\n` +
                    `**Moderator:** ${interaction.user}`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       WARN
    ===================================================== */

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
            interaction.options.getUser(
                "user"
            );

        const reason =
            interaction.options.getString(
                "reason"
            );

        const data =
            getGuildData(
                interaction.guild.id
            );

        if (!data.warnings[user.id]) {
            data.warnings[user.id] = [];
        }

        data.warnings[user.id].push({
            reason,
            moderator:
                interaction.user.id,
            timestamp: Date.now()
        });

        saveData();

        const warningCount =
            data.warnings[user.id].length;

        await sendLog(
            interaction.guild,
            embed(
                "Member Warned",
                `**User:** ${user}\n` +
                `**User ID:** ${user.id}\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Reason:** ${reason}\n` +
                `**Total Warnings:** ${warningCount}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Member Warned",
                    `${user} has received a warning.\n\n` +
                    `**Reason:** ${reason}\n` +
                    `**Total Warnings:** ${warningCount}\n` +
                    `**Moderator:** ${interaction.user}`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       WARNINGS
    ===================================================== */

    if (command === "warnings") {
        const user =
            interaction.options.getUser(
                "user"
            );

        const data =
            getGuildData(
                interaction.guild.id
            );

        const warnings =
            data.warnings[user.id] || [];

        if (
            warnings.length === 0
        ) {
            return interaction.reply({
                embeds: [
                    embed(
                        "Warnings",
                        `${user} currently has no warnings in this server.`
                    )
                ],
                ephemeral: true
            });
        }

        const description =
            warnings
                .map(
                    (warning, index) =>
                        `**Warning ${index + 1}**\n` +
                        `**Reason:** ${warning.reason}\n` +
                        `**Moderator:** <@${warning.moderator}>\n` +
                        `**Date:** <t:${Math.floor(
                            warning.timestamp / 1000
                        )}:F>`
                )
                .join("\n\n");

        return interaction.reply({
            embeds: [
                embed(
                    `Warnings — ${user.tag}`,
                    `**Total Warnings:** ${warnings.length}\n\n${description}`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       CLEAR WARNINGS
    ===================================================== */

    if (command === "clearwarnings") {
        const user =
            interaction.options.getUser(
                "user"
            );

        const data =
            getGuildData(
                interaction.guild.id
            );

        const existing =
            data.warnings[user.id]?.length ||
            0;

        delete data.warnings[user.id];

        saveData();

        await sendLog(
            interaction.guild,
            embed(
                "Warnings Cleared",
                `**User:** ${user}\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Warnings Removed:** ${existing}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Warnings Cleared",
                    `All warnings for ${user} have been removed.\n\n` +
                    `**Warnings Removed:** ${existing}\n` +
                    `**Moderator:** ${interaction.user}`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       PURGE
    ===================================================== */

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
            interaction.options.getInteger(
                "amount"
            );

        const deleted =
            await interaction.channel.bulkDelete(
                amount,
                true
            );

        await sendLog(
            interaction.guild,
            embed(
                "Messages Purged",
                `**Channel:** ${interaction.channel}\n` +
                `**Messages Deleted:** ${deleted.size}\n` +
                `**Moderator:** ${interaction.user}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Messages Purged",
                    `Ghosty deleted **${deleted.size}** message(s) from ${interaction.channel}.\n\n` +
                    `**Moderator:** ${interaction.user}`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       SLOWMODE
    ===================================================== */

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
            interaction.options.getInteger(
                "seconds"
            );

        await interaction.channel.setRateLimitPerUser(
            seconds
        );

        await sendLog(
            interaction.guild,
            embed(
                "Slowmode Updated",
                `**Channel:** ${interaction.channel}\n` +
                `**New Slowmode:** ${seconds === 0 ? "Disabled" : `${seconds} seconds`}\n` +
                `**Moderator:** ${interaction.user}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Slowmode Updated",
                    seconds === 0
                        ? `Slowmode has been disabled in ${interaction.channel}.`
                        : `Slowmode is now **${seconds} seconds** in ${interaction.channel}.`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       LOCK
    ===================================================== */

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
            embed(
                "Channel Locked",
                `**Channel:** ${interaction.channel}\n` +
                `**Moderator:** ${interaction.user}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Channel Locked",
                    `${interaction.channel} has been locked.`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       UNLOCK
    ===================================================== */

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
            embed(
                "Channel Unlocked",
                `**Channel:** ${interaction.channel}\n` +
                `**Moderator:** ${interaction.user}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Channel Unlocked",
                    `${interaction.channel} has been unlocked.`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       LOCKDOWN
    ===================================================== */

    if (
        command === "lockdown" ||
        command === "unlockdown"
    ) {
        const data =
            getGuildData(
                interaction.guild.id
            );

        /* ---------------- START ---------------- */

        if (
            command === "lockdown"
        ) {
            if (
                data.lockdown.enabled
            ) {
                return interaction.reply({
                    embeds: [
                        errorEmbed(
                            "A server lockdown is already active."
                        )
                    ],
                    ephemeral: true
                });
            }

            data.lockdown.enabled =
                true;

            data.lockdown.channels = {};

            const channels =
                interaction.guild.channels.cache.filter(
                    channel =>
                        channel.type ===
                            ChannelType.GuildText &&
                        channel
                            .permissionOverwrites
                );

            let locked = 0;

            for (
                const channel of
                    channels.values()
            ) {
                const everyoneOverwrite =
                    channel.permissionOverwrites.cache.get(
                        interaction.guild.roles.everyone.id
                    );

                data.lockdown.channels[
                    channel.id
                ] = {
                    allow:
                        everyoneOverwrite
                            ? everyoneOverwrite.allow.bitfield.toString()
                            : "0",
                    deny:
                        everyoneOverwrite
                            ? everyoneOverwrite.deny.bitfield.toString()
                            : "0"
                };

                const success =
                    await channel.permissionOverwrites.edit(
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
                embed(
                    "Server Lockdown",
                    `A server-wide lockdown was activated.\n\n` +
                    `**Moderator:** ${interaction.user}\n` +
                    `**Channels Locked:** ${locked}`
                )
            );

            return interaction.reply({
                embeds: [
                    successEmbed(
                        "Server Lockdown",
                        `Ghosty has activated a server-wide lockdown.\n\n` +
                        `**Channels Locked:** ${locked}\n` +
                        `**Moderator:** ${interaction.user}`
                    )
                ],
                ephemeral: true
            });
        }

        /* ---------------- END ---------------- */

        if (
            !data.lockdown.enabled
        ) {
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
                const allow =
                    BigInt(
                        previous.allow || "0"
                    );

                const deny =
                    BigInt(
                        previous.deny || "0"
                    );

                await channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                        allow,
                        deny
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

        data.lockdown.enabled =
            false;

        data.lockdown.channels =
            {};

        saveData();

        await sendLog(
            interaction.guild,
            embed(
                "Lockdown Ended",
                `The server lockdown was ended.\n\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Channels Restored:** ${restored}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Lockdown Ended",
                    `Ghosty has ended the server lockdown.\n\n` +
                    `**Channels Restored:** ${restored}\n` +
                    `**Moderator:** ${interaction.user}`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       GHOSTY SETUP
    ===================================================== */

    if (
        command === "ghostysetup"
    ) {
        return showSetup(
            interaction
        );
    }

    /* =====================================================
       SETTINGS
    ===================================================== */

    if (
        command === "settings"
    ) {
        const data =
            getGuildData(
                interaction.guild.id
            );

        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Settings",
                    `**AutoMod:** ${data.automod.enabled ? "Enabled" : "Disabled"}\n` +
                    `**Spam Protection:** ${data.automod.spam ? "Enabled" : "Disabled"}\n` +
                    `**Mention Protection:** ${data.automod.mentions ? "Enabled" : "Disabled"}\n` +
                    `**Invite Protection:** ${data.automod.invites ? "Enabled" : "Disabled"}\n` +
                    `**Caps Protection:** ${data.automod.caps ? "Enabled" : "Disabled"}\n\n` +

                    `**Honeypot:** ${data.honeypot.enabled ? "Enabled" : "Disabled"}\n` +
                    `**Honeypot Channel:** ${data.honeypot.channel ? `<#${data.honeypot.channel}>` : "Not configured"}\n` +
                    `**Honeypot Kicks:** ${data.honeypot.kicks}\n\n` +

                    `**Logging:** ${data.logChannel ? `<#${data.logChannel}>` : "Not configured"}\n` +
                    `**Staff Role:** ${data.staffRole ? `<@&${data.staffRole}>` : "Not configured"}\n` +
                    `**Lockdown:** ${data.lockdown.enabled ? "Active" : "Inactive"}`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       AUTOMOD CONFIG
    ===================================================== */

    if (
        command === "automodconfig"
    ) {
        return showAutoMod(
            interaction
        );
    }

    /* =====================================================
       LOGS
    ===================================================== */

    if (
        command === "logs"
    ) {
        const data =
            getGuildData(
                interaction.guild.id
            );

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

        return interaction.reply({
            embeds: [
                embed(
                    "Logging Configuration",
                    `**Current Channel:** ${
                        data.logChannel
                            ? `<#${data.logChannel}>`
                            : "Not configured"
                    }\n\nSelect the channel Ghosty should use for moderation and security logs.`
                )
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(menu)
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       USER INFO
    ===================================================== */

    if (
        command === "userinfo"
    ) {
        const user =
            interaction.options.getUser(
                "user"
            ) ||
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
                            b.position -
                            a.position
                    )
                    .map(
                        role =>
                            role.toString()
                    )
                    .join(", ") ||
                  "None"
                : "Not a member";

        const accountAge =
            Math.floor(
                (
                    Date.now() -
                    user.createdTimestamp
                ) / 86400000
            );

        return interaction.reply({
            embeds: [
                embed(
                    "User Information",
                    `**Username:** ${user.tag}\n` +
                    `**User ID:** ${user.id}\n` +
                    `**Bot Account:** ${user.bot ? "Yes" : "No"}\n` +
                    `**Account Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:F>\n` +
                    `**Account Age:** ${accountAge} day(s)\n\n` +

                    `**Server Member:** ${member ? "Yes" : "No"}\n` +
                    `**Joined Server:** ${
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

    /* =====================================================
       SERVER INFO
    ===================================================== */

    if (
        command === "serverinfo"
    ) {
        const guild =
            interaction.guild;

        const owner =
            await guild.fetchOwner()
                .catch(() => null);

        const textChannels =
            guild.channels.cache.filter(
                channel =>
                    channel.type ===
                    ChannelType.GuildText
            ).size;

        const voiceChannels =
            guild.channels.cache.filter(
                channel =>
                    channel.type ===
                    ChannelType.GuildVoice
            ).size;

        const categories =
            guild.channels.cache.filter(
                channel =>
                    channel.type ===
                    ChannelType.GuildCategory
            ).size;

        return interaction.reply({
            embeds: [
                embed(
                    "Server Information",
                    `**Name:** ${guild.name}\n` +
                    `**Server ID:** ${guild.id}\n` +
                    `**Owner:** ${owner ? owner.user.tag : `<@${guild.ownerId}>`}\n` +
                    `**Members:** ${guild.memberCount}\n` +
                    `**Roles:** ${guild.roles.cache.size}\n` +
                    `**Channels:** ${guild.channels.cache.size}\n` +
                    `**Text Channels:** ${textChannels}\n` +
                    `**Voice Channels:** ${voiceChannels}\n` +
                    `**Categories:** ${categories}\n` +
                    `**Boost Level:** ${guild.premiumTier}\n` +
                    `**Boosts:** ${guild.premiumSubscriptionCount || 0}\n` +
                    `**Verification Level:** ${guild.verificationLevel}\n` +
                    `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       ROLE INFO
    ===================================================== */

    if (
        command === "roleinfo"
    ) {
        const role =
            interaction.options.getRole(
                "role"
            );

        return interaction.reply({
            embeds: [
                embed(
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

    /* =====================================================
       CHANNEL INFO
    ===================================================== */

    if (
        command === "channelinfo"
    ) {
        const channel =
            interaction.channel;

        return interaction.reply({
            embeds: [
                embed(
                    "Channel Information",
                    `**Name:** ${channel.name}\n` +
                    `**ID:** ${channel.id}\n` +
                    `**Type:** ${channel.type}\n` +
                    `**Category:** ${channel.parent ? channel.parent.name : "None"}\n` +
                    `**Position:** ${channel.position}\n` +
                    `**Slowmode:** ${
                        "rateLimitPerUser" in channel
                            ? `${channel.rateLimitPerUser} second(s)`
                            : "Not available"
                    }\n` +
                    `**Created:** <t:${Math.floor(channel.createdTimestamp / 1000)}:F>`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       AVATAR
    ===================================================== */

    if (
        command === "avatar"
    ) {
        const user =
            interaction.options.getUser(
                "user"
            ) ||
            interaction.user;

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(
                        EMBED_COLOR
                    )
                    .setTitle(
                        `${user.tag}'s Avatar`
                    )
                    .setImage(
                        user.displayAvatarURL({
                            size: 4096
                        })
                    )
                    .setFooter({
                        text: `User ID: ${user.id}`
                    })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       BANNER
    ===================================================== */

    if (
        command === "banner"
    ) {
        const user =
            interaction.options.getUser(
                "user"
            ) ||
            interaction.user;

        const fetched =
            await user.fetch();

        if (!fetched.banner) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "That user does not have a profile banner."
                    )
                ],
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(
                        EMBED_COLOR
                    )
                    .setTitle(
                        `${user.tag}'s Profile Banner`
                    )
                    .setImage(
                        fetched.bannerURL({
                            size: 4096
                        })
                    )
                    .setFooter({
                        text: `User ID: ${user.id}`
                    })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       HELP
    ===================================================== */

    if (
        command === "help"
    ) {
        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Commands",
                    `**Moderation**\n` +
                    `/ban — Ban a member\n` +
                    `/unban — Unban a user\n` +
                    `/kick — Kick a member\n` +
                    `/timeout — Timeout a member\n` +
                    `/untimeout — Remove a timeout\n` +
                    `/warn — Warn a member\n` +
                    `/warnings — View warnings\n` +
                    `/clearwarnings — Clear warnings\n\n` +

                    `**Channel Management**\n` +
                    `/purge — Delete messages\n` +
                    `/slowmode — Change slowmode\n` +
                    `/lock — Lock a channel\n` +
                    `/unlock — Unlock a channel\n` +
                    `/lockdown — Lock the server\n` +
                    `/unlockdown — End a lockdown\n\n` +

                    `**Configuration**\n` +
                    `/ghostysetup — Main configuration panel\n` +
                    `/settings — View current settings\n` +
                    `/automodconfig — Configure AutoMod\n` +
                    `/logs — Configure logging\n\n` +

                    `**Information**\n` +
                    `/userinfo — User information\n` +
                    `/serverinfo — Server information\n` +
                    `/roleinfo — Role information\n` +
                    `/channelinfo — Channel information\n` +
                    `/avatar — View an avatar\n` +
                    `/banner — View a profile banner\n\n` +

                    `**Utility**\n` +
                    `/help — View commands\n` +
                    `/ping — Check latency\n` +
                    `/uptime — View uptime\n` +
                    `/botinfo — View Ghosty information\n` +
                    `/invite — Get the bot invite\n` +
                    `/support — Support information`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       PING
    ===================================================== */

    if (
        command === "ping"
    ) {
        const apiLatency =
            Date.now() -
            interaction.createdTimestamp;

        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Ping",
                    `**WebSocket Latency:** ${client.ws.ping}ms\n` +
                    `**API Response:** ${apiLatency}ms\n` +
                    `**Status:** Online`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       UPTIME
    ===================================================== */

    if (
        command === "uptime"
    ) {
        const totalSeconds =
            Math.floor(
                process.uptime()
            );

        const days =
            Math.floor(
                totalSeconds / 86400
            );

        const hours =
            Math.floor(
                (totalSeconds % 86400) /
                3600
            );

        const minutes =
            Math.floor(
                (totalSeconds % 3600) /
                60
            );

        const seconds =
            totalSeconds % 60;

        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Uptime",
                    `Ghosty has been online for:\n\n` +
                    `**Days:** ${days}\n` +
                    `**Hours:** ${hours}\n` +
                    `**Minutes:** ${minutes}\n` +
                    `**Seconds:** ${seconds}`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       BOT INFO
    ===================================================== */

    if (
        command === "botinfo"
    ) {
        const totalUsers =
            client.guilds.cache.reduce(
                (total, guild) =>
                    total +
                    guild.memberCount,
                0
            );

        const totalChannels =
            client.guilds.cache.reduce(
                (total, guild) =>
                    total +
                    guild.channels.cache.size,
                0
            );

        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty",
                    `Ghosty is a Discord moderation and server-management bot designed to give communities powerful tools through a simple interface.\n\n` +

                    `**Version:** 1.1.0\n` +
                    `**Bot ID:** ${client.user.id}\n` +
                    `**Servers:** ${client.guilds.cache.size}\n` +
                    `**Users:** ${totalUsers.toLocaleString()}\n` +
                    `**Channels:** ${totalChannels.toLocaleString()}\n` +
                    `**Commands:** ${commands.length}\n` +
                    `**Discord.js:** ${require("discord.js").version}\n` +
                    `**Node.js:** ${process.version}\n` +
                    `**Uptime:** ${Math.floor(process.uptime() / 60)} minute(s)`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       INVITE
    ===================================================== */

    if (
        command === "invite"
    ) {
        const application =
            await client.application.fetch();

        const invite =
            `https://discord.com/oauth2/authorize?client_id=${application.id}&permissions=8&scope=bot%20applications.commands`;

        return interaction.reply({
            embeds: [
                embed(
                    "Invite Ghosty",
                    `Add Ghosty to your Discord server using the link below.\n\n` +
                    `[Add Ghosty](${invite})\n\n` +
                    `Ghosty requests the permissions required for its moderation, logging, AutoMod and security features.`
                )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       SUPPORT
    ===================================================== */

    if (
        command === "support"
    ) {
        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Support",
                    `Ghosty support has not been configured yet.\n\n` +
                    `Use this command as the central place for your support server information once you have one.`
                )
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   SETUP PANEL
========================================================= */

async function showSetup(
    interaction
) {
    const data =
        getGuildData(
            interaction.guild.id
        );

    const setupEmbed =
        embed(
            "Ghosty Setup",
            `Configure Ghosty for **${interaction.guild.name}**.\n\n` +

            `**AutoMod:** ${data.automod.enabled ? "Enabled" : "Disabled"}\n` +
            `**Honeypot:** ${data.honeypot.enabled ? "Enabled" : "Disabled"}\n` +
            `**Honeypot Channel:** ${data.honeypot.channel ? `<#${data.honeypot.channel}>` : "Not configured"}\n` +
            `**Log Channel:** ${data.logChannel ? `<#${data.logChannel}>` : "Not configured"}\n` +
            `**Staff Role:** ${data.staffRole ? `<@&${data.staffRole}>` : "Not configured"}\n` +
            `**Lockdown:** ${data.lockdown.enabled ? "Active" : "Inactive"}\n\n` +

            `Use the buttons below to configure individual Ghosty systems.`
        );

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "setup_automod"
                    )
                    .setLabel(
                        "AutoMod"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "setup_honeypot"
                    )
                    .setLabel(
                        "Honeypot"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "setup_logs"
                    )
                    .setLabel(
                        "Logging"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "setup_staff"
                    )
                    .setLabel(
                        "Staff"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    return interaction.reply({
        embeds: [
            setupEmbed
        ],
        components: [
            row
        ],
        ephemeral: true
    });
}

/* =========================================================
   AUTOMOD PANEL
========================================================= */

async function showAutoMod(
    interaction
) {
    const data =
        getGuildData(
            interaction.guild.id
        );

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "automod_enable"
                    )
                    .setLabel(
                        "Enable"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "automod_disable"
                    )
                    .setLabel(
                        "Disable"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "automod_options"
                    )
                    .setLabel(
                        "Options"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    )
            );

    return interaction.reply({
        embeds: [
            embed(
                "Ghosty AutoMod",
                `**Status:** ${data.automod.enabled ? "Enabled" : "Disabled"}\n\n` +

                `**Spam Protection:** ${data.automod.spam ? "Enabled" : "Disabled"}\n` +
                `**Mention Protection:** ${data.automod.mentions ? "Enabled" : "Disabled"}\n` +
                `**Invite Protection:** ${data.automod.invites ? "Enabled" : "Disabled"}\n` +
                `**Caps Protection:** ${data.automod.caps ? "Enabled" : "Disabled"}\n\n` +

                `AutoMod automatically removes messages that violate the enabled protection systems.`
            )
        ],
        components: [
            row
        ],
        ephemeral: true
    });
}

/* =========================================================
   BUTTON HANDLER
========================================================= */

async function handleButton(
    interaction
) {
    const data =
        getGuildData(
            interaction.guild.id
        );

    /*
     * Configuration buttons are administrator-only.
     */

    const configurationButtons = [
        "setup_automod",
        "setup_honeypot",
        "setup_logs",
        "setup_staff",
        "honeypot_enable",
        "honeypot_disable",
        "automod_enable",
        "automod_disable",
        "automod_options"
    ];

    if (
        configurationButtons.includes(
            interaction.customId
        )
    ) {
        if (!isAdmin(interaction)) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "You need Administrator permissions to configure Ghosty."
                    )
                ],
                ephemeral: true
            });
        }
    }

    /* ---------------- SETUP AUTOMOD ---------------- */

    if (
        interaction.customId ===
        "setup_automod"
    ) {
        return showAutoMod(
            interaction
        );
    }

    /* ---------------- SETUP HONEYPOT ---------------- */

    if (
        interaction.customId ===
        "setup_honeypot"
    ) {
        const channelMenu =
            new ChannelSelectMenuBuilder()
                .setCustomId(
                    "select_honeypot_channel"
                )
                .setPlaceholder(
                    "Select the honeypot channel"
                )
                .setChannelTypes(
                    ChannelType.GuildText
                );

        const buttons =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "honeypot_enable"
                        )
                        .setLabel(
                            "Enable"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "honeypot_disable"
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
                embed(
                    "Honeypot Configuration",
                    `**Status:** ${data.honeypot.enabled ? "Enabled" : "Disabled"}\n` +
                    `**Channel:** ${data.honeypot.channel ? `<#${data.honeypot.channel}>` : "Not configured"}\n` +
                    `**Kicks:** ${data.honeypot.kicks}\n\n` +
                    `Select a channel below. Messages sent in the configured honeypot channel will be deleted and the sender will be kicked when Ghosty can do so.`
                )
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        channelMenu
                    ),
                buttons
            ]
        });
    }

    /* ---------------- HONEYPOT ENABLE ---------------- */

    if (
        interaction.customId ===
        "honeypot_enable"
    ) {
        if (
            !data.honeypot.channel
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Select a honeypot channel before enabling the system."
                    )
                ],
                ephemeral: true
            });
        }

        data.honeypot.enabled =
            true;

        saveData();

        return interaction.update({
            embeds: [
                successEmbed(
                    "Honeypot Enabled",
                    `The honeypot is now active in <#${data.honeypot.channel}>.\n\n` +
                    `Messages sent there will be deleted and the sender will be kicked when possible.`
                )
            ],
            components: []
        });
    }

    /* ---------------- HONEYPOT DISABLE ---------------- */

    if (
        interaction.customId ===
        "honeypot_disable"
    ) {
        data.honeypot.enabled =
            false;

        saveData();

        return interaction.update({
            embeds: [
                successEmbed(
                    "Honeypot Disabled",
                    "The honeypot has been disabled. Messages in the configured channel will no longer trigger the honeypot action."
                )
            ],
            components: []
        });
    }

    /* ---------------- SETUP LOGGING ---------------- */

    if (
        interaction.customId ===
        "setup_logs"
    ) {
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
                embed(
                    "Logging Configuration",
                    `**Current Channel:** ${data.logChannel ? `<#${data.logChannel}>` : "Not configured"}\n\n` +
                    `Select the channel Ghosty should use for moderation and security logs.`
                )
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        menu
                    )
            ]
        });
    }

    /* ---------------- SETUP STAFF ---------------- */

    if (
        interaction.customId ===
        "setup_staff"
    ) {
        const menu =
            new RoleSelectMenuBuilder()
                .setCustomId(
                    "select_staff_role"
                )
                .setPlaceholder(
                    "Select the Ghosty staff role"
                )
                .setMinValues(1)
                .setMaxValues(1);

        return interaction.update({
            embeds: [
                embed(
                    "Staff Configuration",
                    `**Current Staff Role:** ${data.staffRole ? `<@&${data.staffRole}>` : "Not configured"}\n\n` +
                    `Select the role that should count as Ghosty staff.\n\n` +
                    `Members with this role can use Ghosty's staff moderation commands.`
                )
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        menu
                    )
            ]
        });
    }

    /* ---------------- AUTOMOD ENABLE ---------------- */

    if (
        interaction.customId ===
        "automod_enable"
    ) {
        data.automod.enabled =
            true;

        saveData();

        return interaction.update({
            embeds: [
                successEmbed(
                    "AutoMod Enabled",
                    "Ghosty's AutoMod system is now enabled."
                )
            ],
            components: []
        });
    }

    /* ---------------- AUTOMOD DISABLE ---------------- */

    if (
        interaction.customId ===
        "automod_disable"
    ) {
        data.automod.enabled =
            false;

        saveData();

        return interaction.update({
            embeds: [
                successEmbed(
                    "AutoMod Disabled",
                    "Ghosty's AutoMod system is now disabled."
                )
            ],
            components: []
        });
    }

    /* ---------------- AUTOMOD OPTIONS ---------------- */

    if (
        interaction.customId ===
        "automod_options"
    ) {
        const menu =
            new StringSelectMenuBuilder()
                .setCustomId(
                    "automod_toggle"
                )
                .setPlaceholder(
                    "Select a protection to toggle"
                )
                .addOptions(
                    {
                        label:
                            "Spam Protection",
                        value:
                            "spam"
                    },
                    {
                        label:
                            "Mention Protection",
                        value:
                            "mentions"
                    },
                    {
                        label:
                            "Invite Protection",
                        value:
                            "invites"
                    },
                    {
                        label:
                            "Caps Protection",
                        value:
                            "caps"
                    }
                );

        return interaction.update({
            embeds: [
                embed(
                    "AutoMod Options",
                    `Select a protection below to toggle it.\n\n` +
                    `**Spam:** ${data.automod.spam ? "Enabled" : "Disabled"}\n` +
                    `**Mentions:** ${data.automod.mentions ? "Enabled" : "Disabled"}\n` +
                    `**Invites:** ${data.automod.invites ? "Enabled" : "Disabled"}\n` +
                    `**Caps:** ${data.automod.caps ? "Enabled" : "Disabled"}`
                )
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        menu
                    )
            ]
        });
    }
}

/* =========================================================
   CHANNEL SELECT HANDLER
========================================================= */

async function handleChannelSelect(
    interaction
) {
    if (!isAdmin(interaction)) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "You need Administrator permissions to configure Ghosty."
                )
            ],
            ephemeral: true
        });
    }

    const data =
        getGuildData(
            interaction.guild.id
        );

    const channelId =
        interaction.values[0];

    /* ---------------- HONEYPOT ---------------- */

    if (
        interaction.customId ===
        "select_honeypot_channel"
    ) {
        data.honeypot.channel =
            channelId;

        saveData();

        return interaction.update({
            embeds: [
                successEmbed(
                    "Honeypot Channel Set",
                    `The honeypot channel has been set to <#${channelId}>.\n\n` +
                    `Use the Enable button to activate the honeypot.`
                )
            ],
            components: []
        });
    }

    /* ---------------- LOGGING ---------------- */

    if (
        interaction.customId ===
        "select_log_channel"
    ) {
        data.logChannel =
            channelId;

        saveData();

        return interaction.update({
            embeds: [
                successEmbed(
                    "Logging Channel Set",
                    `Ghosty will now send moderation and security logs to <#${channelId}>.`
                )
            ],
            components: []
        });
    }
}

/* =========================================================
   ROLE SELECT HANDLER
========================================================= */

async function handleRoleSelect(
    interaction
) {
    if (!isAdmin(interaction)) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "You need Administrator permissions to configure Ghosty."
                )
            ],
            ephemeral: true
        });
    }

    const data =
        getGuildData(
            interaction.guild.id
        );

    if (
        interaction.customId ===
        "select_staff_role"
    ) {
        data.staffRole =
            interaction.values[0];

        saveData();

        return interaction.update({
            embeds: [
                successEmbed(
                    "Staff Role Set",
                    `Ghosty's staff role is now <@&${data.staffRole}>.`
                )
            ],
            components: []
        });
    }
}

/* =========================================================
   STRING SELECT HANDLER
========================================================= */

async function handleStringSelect(
    interaction
) {
    if (!isAdmin(interaction)) {
        return interaction.reply({
            embeds: [
                errorEmbed(
                    "You need Administrator permissions to configure Ghosty."
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
                    "That AutoMod option is invalid."
                )
            ],
            ephemeral: true
        });
    }

    data.automod[option] =
        !data.automod[option];

    saveData();

    const names = {
        spam: "Spam",
        mentions: "Mention",
        invites: "Invite",
        caps: "Caps"
    };

    return interaction.update({
        embeds: [
            successEmbed(
                "AutoMod Updated",
                `**${names[option]} Protection** is now **${
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
   TOKEN CHECK
========================================================= */

if (
    !process.env.DISCORD_TOKEN
) {
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
