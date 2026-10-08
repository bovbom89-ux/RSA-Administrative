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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const EMBED_COLOR = "#E75D2A";
const DATA_DIR = path.join(__dirname, "../data");
const DATA_FILE = path.join(DATA_DIR, "guilds.json");

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

function embed(title, description) {
    return new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle(title)
        .setDescription(description);
}

function errorEmbed(description) {
    return embed("Action Failed", description);
}

function successEmbed(title, description) {
    return embed(title, description);
}

/* =========================================================
   COMMANDS
========================================================= */

const commands = [
    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member to ban.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the ban.")
        ),

    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user.")
        .addStringOption(o =>
            o.setName("userid")
                .setDescription("User ID.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member to kick.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the kick.")
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Timeout a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member to timeout.")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("minutes")
                .setDescription("Timeout duration.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the timeout.")
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove a member's timeout.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("View a member's warnings.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clear a member's warnings.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Delete messages.")
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("Number of messages.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete messages.")
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("Number of messages.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Change channel slowmode.")
        .addIntegerOption(o =>
            o.setName("seconds")
                .setDescription("Slowmode in seconds.")
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

    new SlashCommandBuilder()
        .setName("ghostysetup")
        .setDescription("Configure Ghosty."),

    new SlashCommandBuilder()
        .setName("settings")
        .setDescription("View Ghosty settings."),

    new SlashCommandBuilder()
        .setName("automodconfig")
        .setDescription("Configure AutoMod."),

    new SlashCommandBuilder()
        .setName("logs")
        .setDescription("Configure logging."),

    new SlashCommandBuilder()
        .setName("logsstatus")
        .setDescription("View logging settings."),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("View user information.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("User.")
        ),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("View server information."),

    new SlashCommandBuilder()
        .setName("roleinfo")
        .setDescription("View role information.")
        .addRoleOption(o =>
            o.setName("role")
                .setDescription("Role.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("channelinfo")
        .setDescription("View channel information."),

    new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("View a user's avatar.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("User.")
        ),

    new SlashCommandBuilder()
        .setName("banner")
        .setDescription("View a user's banner.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("User.")
        ),

    new SlashCommandBuilder()
        .setName("staff")
        .setDescription("View the configured staff settings."),

    new SlashCommandBuilder()
        .setName("modstats")
        .setDescription("View moderation statistics."),

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
        .setDescription("Get the Ghosty invite."),

    new SlashCommandBuilder()
        .setName("support")
        .setDescription("Get the Ghosty support server.")
].map(command => command.toJSON());

/* =========================================================
   DUPLICATE CHECK
========================================================= */

const commandNames = commands.map(command => command.name);

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
        const application = await client.application.fetch();

        const rest = new REST({
            version: "10"
        }).setToken(process.env.DISCORD_TOKEN);

        await rest.put(
            Routes.applicationCommands(application.id),
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

function hasPermission(interaction, permission) {
    return interaction.memberPermissions.has(
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
    const data = getGuildData(
        interaction.guild.id
    );

    if (isAdmin(interaction)) {
        return true;
    }

    if (
        data.staffRole &&
        interaction.member.roles.cache.has(
            data.staffRole
        )
    ) {
        return true;
    }

    return (
        interaction.memberPermissions.has(
            PermissionsBitField.Flags.ManageMessages
        ) ||
        interaction.memberPermissions.has(
            PermissionsBitField.Flags.KickMembers
        ) ||
        interaction.memberPermissions.has(
            PermissionsBitField.Flags.BanMembers
        ) ||
        interaction.memberPermissions.has(
            PermissionsBitField.Flags.ModerateMembers
        )
    );
}

async function requireAdmin(interaction) {
    if (isAdmin(interaction)) return true;

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
    if (isStaff(interaction)) return true;

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

    if (!data.logChannel) return;

    const channel = guild.channels.cache.get(
        data.logChannel
    );

    if (!channel || !channel.isTextBased()) return;

    await channel.send({
        embeds: [logEmbed]
    }).catch(() => {});
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
   MESSAGE / AUTOMOD / HONEYPOT
========================================================= */

const messageTracker = new Map();

client.on("messageCreate", async message => {
    if (!message.guild) return;
    if (message.author.bot) return;

    const data = getGuildData(
        message.guild.id
    );

    /* ---------------- HONEYPOT ---------------- */

    if (
        data.honeypot.enabled &&
        data.honeypot.channel === message.channel.id
    ) {
        await message.delete().catch(() => {});

        const member = message.member;

        if (!member) return;

        if (
            !member.kickable ||
            member.permissions.has(
                PermissionsBitField.Flags.Administrator
            )
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

        await member.kick(
            "Ghosty Honeypot"
        ).catch(() => {});

        data.honeypot.kicks++;

        saveData();

        const counter = new ButtonBuilder()
            .setCustomId("honeypot_kicks")
            .setLabel(
                `Kicks: ${data.honeypot.kicks}`
            )
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const row = new ActionRowBuilder()
            .addComponents(counter);

        if (data.logChannel) {
            const logChannel =
                message.guild.channels.cache.get(
                    data.logChannel
                );

            if (
                logChannel &&
                logChannel.isTextBased()
            ) {
                await logChannel.send({
                    embeds: [
                        embed(
                            "Honeypot Triggered",
                            `A member has been automatically removed for sending a message in the honeypot channel.\n\n` +
                            `**User:** ${message.author}\n` +
                            `**User ID:** ${message.author.id}\n` +
                            `**Channel:** ${message.channel}\n` +
                            `**Action:** Kick`
                        )
                    ],
                    components: [row]
                }).catch(() => {});
            }
        }

        return;
    }

    /* ---------------- AUTOMOD ---------------- */

    if (!data.automod.enabled) return;

    let violation = null;

    if (
        data.automod.invites &&
        /discord\.gg\/|discord\.com\/invite\//i.test(
            message.content
        )
    ) {
        violation = "Discord invite links are not allowed.";
    }

    if (
        !violation &&
        data.automod.mentions &&
        message.mentions.users.size >= 6
    ) {
        violation = "Excessive mentions detected.";
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
            violation = "Excessive capital letters detected.";
        }
    }

    if (!violation && data.automod.spam) {
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
            violation = "Message spam detected.";
        }
    }

    if (!violation) return;

    await message.delete().catch(() => {});

    await sendLog(
        message.guild,
        embed(
            "AutoMod Action",
            `Ghosty removed a message for violating AutoMod.\n\n` +
            `**User:** ${message.author}\n` +
            `**Channel:** ${message.channel}\n` +
            `**Reason:** ${violation}`
        )
    );
});

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
            await interaction.followUp(
                response
            ).catch(() => {});
        } else {
            await interaction.reply(
                response
            ).catch(() => {});
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
        "settings",
        "automodconfig",
        "logs",
        "logsstatus",
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
        "clear",
        "purge",
        "slowmode",
        "lock",
        "unlock",
        "staff",
        "modstats"
    ];

    if (
        adminCommands.includes(command) &&
        !(await requireAdmin(interaction))
    ) {
        return;
    }

    if (
        staffCommands.includes(command) &&
        !(await requireStaff(interaction))
    ) {
        return;
    }

    /* ---------------- BAN ---------------- */

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
            !member.bannable
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Ghosty cannot ban that member. Check the role hierarchy."
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
                `**Moderator:** ${interaction.user}\n` +
                `**Reason:** ${reason}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Member Banned",
                    `${user} has been banned.\n\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- UNBAN ---------------- */

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

            return interaction.reply({
                embeds: [
                    successEmbed(
                        "User Unbanned",
                        `User ID **${userId}** has been unbanned.`
                    )
                ],
                ephemeral: true
            });
        } catch {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "That user could not be unbanned."
                    )
                ],
                ephemeral: true
            });
        }
    }

    /* ---------------- KICK ---------------- */

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
            !member.kickable
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Ghosty cannot kick that member. Check the role hierarchy."
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
                `**Moderator:** ${interaction.user}\n` +
                `**Reason:** ${reason}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Member Kicked",
                    `${user} has been kicked.\n\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- TIMEOUT ---------------- */

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
            embed(
                "Member Timed Out",
                `**User:** ${user}\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Duration:** ${minutes} minute(s)\n` +
                `**Reason:** ${reason}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Member Timed Out",
                    `${user} has been timed out for **${minutes} minute(s)**.\n\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- UNTIMEOUT ---------------- */

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
            interaction.options.getUser("user");

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
                        "Ghosty cannot modify that member."
                    )
                ],
                ephemeral: true
            });
        }

        await member.timeout(null);

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Timeout Removed",
                    `The timeout has been removed from ${user}.`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- WARN ---------------- */

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
            moderator: interaction.user.id,
            timestamp: Date.now()
        });

        saveData();

        await sendLog(
            interaction.guild,
            embed(
                "Member Warned",
                `**User:** ${user}\n` +
                `**Moderator:** ${interaction.user}\n` +
                `**Reason:** ${reason}`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Member Warned",
                    `${user} has received a warning.\n\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- WARNINGS ---------------- */

    if (command === "warnings") {
        const user =
            interaction.options.getUser("user");

        const data =
            getGuildData(
                interaction.guild.id
            );

        const warnings =
            data.warnings[user.id] || [];

        if (warnings.length === 0) {
            return interaction.reply({
                embeds: [
                    embed(
                        "Warnings",
                        `${user} has no warnings.`
                    )
                ],
                ephemeral: true
            });
        }

        const description =
            warnings
                .map(
                    (warning, index) =>
                        `**${index + 1}.** ${warning.reason}\n` +
                        `Moderator: <@${warning.moderator}>\n` +
                        `Date: <t:${Math.floor(
                            warning.timestamp / 1000
                        )}:R>`
                )
                .join("\n\n");

        return interaction.reply({
            embeds: [
                embed(
                    `Warnings — ${user.tag}`,
                    description
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- CLEAR WARNINGS ---------------- */

    if (command === "clearwarnings") {
        const user =
            interaction.options.getUser("user");

        const data =
            getGuildData(
                interaction.guild.id
            );

        delete data.warnings[user.id];

        saveData();

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Warnings Cleared",
                    `All warnings for ${user} have been removed.`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- CLEAR / PURGE ---------------- */

    if (
        command === "clear" ||
        command === "purge"
    ) {
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

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Messages Cleared",
                    `Ghosty deleted **${deleted.size}** messages.`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- SLOWMODE ---------------- */

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

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Slowmode Updated",
                    seconds === 0
                        ? "Slowmode has been disabled."
                        : `Slowmode is now **${seconds} seconds**.`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- LOCK ---------------- */

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
                successEmbed(
                    "Channel Locked",
                    "This channel has been locked."
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- UNLOCK ---------------- */

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
                successEmbed(
                    "Channel Unlocked",
                    "This channel has been unlocked."
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- LOCKDOWN ---------------- */

    if (
        command === "lockdown" ||
        command === "unlockdown"
    ) {
        const data =
            getGuildData(
                interaction.guild.id
            );

        if (command === "lockdown") {
            data.lockdown.enabled = true;
            data.lockdown.channels = {};

            const channels =
                interaction.guild.channels.cache.filter(
                    channel =>
                        channel.type ===
                        ChannelType.GuildText
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

                await channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                        SendMessages: false
                    }
                ).catch(() => {});
            }

            saveData();

            await sendLog(
                interaction.guild,
                embed(
                    "Server Lockdown",
                    `${interaction.user} activated a server-wide lockdown.`
                )
            );

            return interaction.reply({
                embeds: [
                    successEmbed(
                        "Server Lockdown",
                        `Ghosty has locked **${channels.size}** text channels.`
                    )
                ],
                ephemeral: true
            });
        }

        if (!data.lockdown.enabled) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "There is no active lockdown."
                    )
                ],
                ephemeral: true
            });
        }

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

            if (!channel) continue;

            await channel.permissionOverwrites.edit(
                interaction.guild.roles.everyone,
                {
                    SendMessages: null
                }
            ).catch(() => {});
        }

        data.lockdown.enabled = false;
        data.lockdown.channels = {};

        saveData();

        await sendLog(
            interaction.guild,
            embed(
                "Lockdown Ended",
                `${interaction.user} ended the server lockdown.`
            )
        );

        return interaction.reply({
            embeds: [
                successEmbed(
                    "Lockdown Ended",
                    "Ghosty has ended the server lockdown."
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- GHOSTY SETUP ---------------- */

    if (command === "ghostysetup") {
        return showSetup(interaction);
    }

    /* ---------------- SETTINGS ---------------- */

    if (command === "settings") {
        const data =
            getGuildData(
                interaction.guild.id
            );

        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Settings",
                    `**AutoMod:** ${
                        data.automod.enabled
                            ? "Enabled"
                            : "Disabled"
                    }\n` +

                    `**Honeypot:** ${
                        data.honeypot.enabled
                            ? "Enabled"
                            : "Disabled"
                    }\n` +

                    `**Honeypot Channel:** ${
                        data.honeypot.channel
                            ? `<#${data.honeypot.channel}>`
                            : "Not configured"
                    }\n` +

                    `**Honeypot Kicks:** ${data.honeypot.kicks}\n` +

                    `**Log Channel:** ${
                        data.logChannel
                            ? `<#${data.logChannel}>`
                            : "Not configured"
                    }\n` +

                    `**Staff Role:** ${
                        data.staffRole
                            ? `<@&${data.staffRole}>`
                            : "Not configured"
                    }\n` +

                    `**Lockdown:** ${
                        data.lockdown.enabled
                            ? "Active"
                            : "Inactive"
                    }`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- AUTOMOD CONFIG ---------------- */

    if (command === "automodconfig") {
        return showAutoMod(interaction);
    }

    /* ---------------- LOGS ---------------- */

    if (command === "logs") {
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
                    `Current channel: ${
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

    /* ---------------- LOG STATUS ---------------- */

    if (command === "logsstatus") {
        const data =
            getGuildData(
                interaction.guild.id
            );

        return interaction.reply({
            embeds: [
                embed(
                    "Logging Status",
                    `**Log Channel:** ${
                        data.logChannel
                            ? `<#${data.logChannel}>`
                            : "Not configured"
                    }`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- USER INFO ---------------- */

    if (command === "userinfo") {
        const user =
            interaction.options.getUser(
                "user"
            ) ||
            interaction.user;

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        return interaction.reply({
            embeds: [
                embed(
                    "User Information",
                    `**Username:** ${user.tag}\n` +
                    `**User ID:** ${user.id}\n` +
                    `**Bot:** ${user.bot ? "Yes" : "No"}\n` +
                    `**Account Created:** <t:${Math.floor(
                        user.createdTimestamp / 1000
                    )}:F>\n` +
                    `**Joined Server:** ${
                        member
                            ? `<t:${Math.floor(
                                member.joinedTimestamp / 1000
                            )}:F>`
                            : "Unknown"
                    }\n` +
                    `**Roles:** ${
                        member
                            ? member.roles.cache
                                .filter(role =>
                                    role.id !==
                                    interaction.guild.id
                                )
                                .map(role => role.toString())
                                .join(", ") ||
                              "None"
                            : "Unknown"
                    }`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- SERVER INFO ---------------- */

    if (command === "serverinfo") {
        const guild =
            interaction.guild;

        return interaction.reply({
            embeds: [
                embed(
                    "Server Information",
                    `**Name:** ${guild.name}\n` +
                    `**ID:** ${guild.id}\n` +
                    `**Owner:** <@${guild.ownerId}>\n` +
                    `**Members:** ${guild.memberCount}\n` +
                    `**Channels:** ${guild.channels.cache.size}\n` +
                    `**Roles:** ${guild.roles.cache.size}\n` +
                    `**Created:** <t:${Math.floor(
                        guild.createdTimestamp / 1000
                    )}:F>`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- ROLE INFO ---------------- */

    if (command === "roleinfo") {
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
                    `**Mentionable:** ${role.mentionable ? "Yes" : "No"}\n` +
                    `**Hoisted:** ${role.hoist ? "Yes" : "No"}`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- CHANNEL INFO ---------------- */

    if (command === "channelinfo") {
        const channel =
            interaction.channel;

        return interaction.reply({
            embeds: [
                embed(
                    "Channel Information",
                    `**Name:** ${channel.name}\n` +
                    `**ID:** ${channel.id}\n` +
                    `**Type:** ${channel.type}\n` +
                    `**Created:** <t:${Math.floor(
                        channel.createdTimestamp / 1000
                    )}:F>`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- AVATAR ---------------- */

    if (command === "avatar") {
        const user =
            interaction.options.getUser(
                "user"
            ) ||
            interaction.user;

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(EMBED_COLOR)
                    .setTitle("Avatar")
                    .setImage(
                        user.displayAvatarURL({
                            size: 4096
                        })
                    )
            ],
            ephemeral: true
        });
    }

    /* ---------------- BANNER ---------------- */

    if (command === "banner") {
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
                    .setColor(EMBED_COLOR)
                    .setTitle("Profile Banner")
                    .setImage(
                        fetched.bannerURL({
                            size: 4096
                        })
                    )
            ],
            ephemeral: true
        });
    }

    /* ---------------- STAFF ---------------- */

    if (command === "staff") {
        const data =
            getGuildData(
                interaction.guild.id
            );

        return interaction.reply({
            embeds: [
                embed(
                    "Staff Settings",
                    `**Staff Role:** ${
                        data.staffRole
                            ? `<@&${data.staffRole}>`
                            : "Not configured"
                    }`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- MOD STATS ---------------- */

    if (command === "modstats") {
        const data =
            getGuildData(
                interaction.guild.id
            );

        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Moderation Statistics",
                    `**Honeypot Kicks:** ${data.honeypot.kicks}\n` +
                    `**Warnings Stored:** ${
                        Object.values(
                            data.warnings
                        ).reduce(
                            (total, list) =>
                                total + list.length,
                            0
                        )
                    }\n` +
                    `**AutoMod:** ${
                        data.automod.enabled
                            ? "Enabled"
                            : "Disabled"
                    }`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- HELP ---------------- */

    if (command === "help") {
        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Commands",
                    `**Moderation**\n` +
                    `/ban /unban /kick /timeout /untimeout /warn /warnings /clearwarnings\n\n` +

                    `**Channel Management**\n` +
                    `/clear /purge /slowmode /lock /unlock /lockdown /unlockdown\n\n` +

                    `**Configuration**\n` +
                    `/ghostysetup /settings /automodconfig /logs /logsstatus\n\n` +

                    `**Information**\n` +
                    `/userinfo /serverinfo /roleinfo /channelinfo /avatar /banner\n\n` +

                    `**Staff**\n` +
                    `/staff /modstats\n\n` +

                    `**Utility**\n` +
                    `/help /ping /uptime /botinfo /invite /support`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- PING ---------------- */

    if (command === "ping") {
        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Ping",
                    `WebSocket latency: **${client.ws.ping}ms**`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- UPTIME ---------------- */

    if (command === "uptime") {
        const totalSeconds =
            Math.floor(process.uptime());

        const days =
            Math.floor(
                totalSeconds / 86400
            );

        const hours =
            Math.floor(
                (totalSeconds % 86400) / 3600
            );

        const minutes =
            Math.floor(
                (totalSeconds % 3600) / 60
            );

        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Uptime",
                    `${days} days, ${hours} hours and ${minutes} minutes.`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- BOT INFO ---------------- */

    if (command === "botinfo") {
        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty",
                    `Ghosty is a Discord moderation and server-management bot built to give staff a simple set of powerful tools.\n\n` +

                    `**Version:** 1.0.0\n` +
                    `**Servers:** ${client.guilds.cache.size}\n` +
                    `**Commands:** ${commands.length}\n` +
                    `**Users:** ${client.guilds.cache.reduce(
                        (total, guild) =>
                            total + guild.memberCount,
                        0
                    )}\n` +
                    `**Discord.js:** ${require("discord.js").version}\n` +
                    `**Uptime:** ${Math.floor(
                        process.uptime() / 60
                    )} minutes`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- INVITE ---------------- */

    if (command === "invite") {
        const application =
            await client.application.fetch();

        return interaction.reply({
            embeds: [
                embed(
                    "Invite Ghosty",
                    `Use the Discord application install page to add Ghosty to your server.\n\n` +
                    `[Add Ghosty](https://discord.com/oauth2/authorize?client_id=${application.id}&permissions=8&scope=bot%20applications.commands)`
                )
            ],
            ephemeral: true
        });
    }

    /* ---------------- SUPPORT ---------------- */

    if (command === "support") {
        return interaction.reply({
            embeds: [
                embed(
                    "Ghosty Support",
                    "The Ghosty support server has not been configured yet."
                )
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   SETUP PANEL
========================================================= */

async function showSetup(interaction) {
    const data =
        getGuildData(
            interaction.guild.id
        );

    const setupEmbed =
        embed(
            "Ghosty Setup",
            `Configure Ghosty for this server.\n\n` +

            `**AutoMod:** ${
                data.automod.enabled
                    ? "Enabled"
                    : "Disabled"
            }\n` +

            `**Honeypot:** ${
                data.honeypot.enabled
                    ? "Enabled"
                    : "Disabled"
            }\n` +

            `**Honeypot Channel:** ${
                data.honeypot.channel
                    ? `<#${data.honeypot.channel}>`
                    : "Not configured"
            }\n` +

            `**Log Channel:** ${
                data.logChannel
                    ? `<#${data.logChannel}>`
                    : "Not configured"
            }\n` +

            `**Staff Role:** ${
                data.staffRole
                    ? `<@&${data.staffRole}>`
                    : "Not configured"
            }\n\n` +

            `Select a section below to configure Ghosty.`
        );

    const row1 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "setup_automod"
                    )
                    .setLabel("AutoMod")
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "setup_honeypot"
                    )
                    .setLabel("Honeypot")
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "setup_logs"
                    )
                    .setLabel("Logging")
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "setup_staff"
                    )
                    .setLabel("Staff")
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    return interaction.reply({
        embeds: [setupEmbed],
        components: [row1],
        ephemeral: true
    });
}

/* =========================================================
   AUTOMOD PANEL
========================================================= */

async function showAutoMod(interaction) {
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
                    .setLabel("Options")
                    .setStyle(
                        ButtonStyle.Primary
                    )
            );

    return interaction.reply({
        embeds: [
            embed(
                "Ghosty AutoMod",
                `**Status:** ${
                    data.automod.enabled
                        ? "Enabled"
                        : "Disabled"
                }\n\n` +

                `**Spam Protection:** ${
                    data.automod.spam
                        ? "Enabled"
                        : "Disabled"
                }\n` +

                `**Mention Protection:** ${
                    data.automod.mentions
                        ? "Enabled"
                        : "Disabled"
                }\n` +

                `**Invite Protection:** ${
                    data.automod.invites
                        ? "Enabled"
                        : "Disabled"
                }\n` +

                `**Caps Protection:** ${
                    data.automod.caps
                        ? "Enabled"
                        : "Disabled"
                }`
            )
        ],
        components: [row],
        ephemeral: true
    });
}

/* =========================================================
   BUTTON HANDLER
========================================================= */

async function handleButton(interaction) {
    const data =
        getGuildData(
            interaction.guild.id
        );

    /* SETUP AUTOMOD */

    if (
        interaction.customId ===
        "setup_automod"
    ) {
        return showAutoMod(
            interaction
        );
    }

    /* SETUP HONEYPOT */

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
                        .setLabel("Enable")
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "honeypot_disable"
                        )
                        .setLabel("Disable")
                        .setStyle(
                            ButtonStyle.Danger
                        )
                );

        return interaction.update({
            embeds: [
                embed(
                    "Honeypot Configuration",
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

                    `**Kicks:** ${data.honeypot.kicks}\n\n` +

                    `Select a channel below. Any message sent in the configured honeypot channel will be deleted and the sender will be kicked when Ghosty can do so.`
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

    /* HONEYPOT ENABLE */

    if (
        interaction.customId ===
        "honeypot_enable"
    ) {
        if (!data.honeypot.channel) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "Select a honeypot channel before enabling the system."
                    )
                ],
                ephemeral: true
            });
        }

        data.honeypot.enabled = true;
        saveData();

        return interaction.update({
            embeds: [
                successEmbed(
                    "Honeypot Enabled",
                    `The honeypot is now active in <#${data.honeypot.channel}>.`
                )
            ],
            components: []
        });
    }

    /* HONEYPOT DISABLE */

    if (
        interaction.customId ===
        "honeypot_disable"
    ) {
        data.honeypot.enabled = false;
        saveData();

        return interaction.update({
            embeds: [
                successEmbed(
                    "Honeypot Disabled",
                    "The honeypot has been disabled."
                )
            ],
            components: []
        });
    }

    /* SETUP LOGGING */

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
                    `**Current Channel:** ${
                        data.logChannel
                            ? `<#${data.logChannel}>`
                            : "Not configured"
                    }\n\nSelect the channel Ghosty should use for logs.`
                )
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(menu)
            ]
        });
    }

    /* SETUP STAFF */

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
                    `**Current Staff Role:** ${
                        data.staffRole
                            ? `<@&${data.staffRole}>`
                            : "Not configured"
                    }\n\nSelect the role that should count as Ghosty staff.`
                )
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(menu)
            ]
        });
    }

    /* AUTOMOD ENABLE */

    if (
        interaction.customId ===
        "automod_enable"
    ) {
        data.automod.enabled = true;
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

    /* AUTOMOD DISABLE */

    if (
        interaction.customId ===
        "automod_disable"
    ) {
        data.automod.enabled = false;
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

    /* AUTOMOD OPTIONS */

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
                        label: "Spam Protection",
                        value: "spam"
                    },
                    {
                        label: "Mention Protection",
                        value: "mentions"
                    },
                    {
                        label: "Invite Protection",
                        value: "invites"
                    },
                    {
                        label: "Caps Protection",
                        value: "caps"
                    }
                );

        return interaction.update({
            embeds: [
                embed(
                    "AutoMod Options",
                    "Select a protection below to enable or disable it."
                )
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(menu)
            ]
        });
    }
}

/* =========================================================
   CHANNEL SELECT HANDLER
========================================================= */

async function handleChannelSelect(interaction) {
    const data =
        getGuildData(
            interaction.guild.id
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
                successEmbed(
                    "Honeypot Channel Set",
                    `The honeypot channel has been set to <#${channelId}>.\n\nUse the Enable button in the honeypot configuration to activate it.`
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
                successEmbed(
                    "Logging Channel Set",
                    `Ghosty will now send logs to <#${channelId}>.`
                )
            ],
            components: []
        });
    }
}

/* =========================================================
   ROLE SELECT HANDLER
========================================================= */

async function handleRoleSelect(interaction) {
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

async function handleStringSelect(interaction) {
    const data =
        getGuildData(
            interaction.guild.id
        );

    if (
        interaction.customId !==
        "automod_toggle"
    ) {
        return;
    }

    const option =
        interaction.values[0];

    data.automod[option] =
        !data.automod[option];

    saveData();

    return interaction.update({
        embeds: [
            successEmbed(
                "AutoMod Updated",
                `**${option} protection** is now ${
                    data.automod[option]
                        ? "enabled"
                        : "disabled"
                }.`
            )
        ],
        components: []
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
