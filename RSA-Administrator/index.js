require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    PermissionsBitField,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    AttachmentBuilder,
    ActivityType
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   RSA UTILITY CONFIG
========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const BOT_NAME = "RSA Utility";
const BOT_VERSION = "7.0.0";

const EMBED_COLOUR = "#2F4DA8";
const RSA_LOGO = "<:Our_Logo:1557149633623363594>";

if (!TOKEN) {
    console.error("DISCORD_TOKEN is missing.");
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error("CLIENT_ID is missing.");
    process.exit(1);
}

if (!GUILD_ID) {
    console.error("GUILD_ID is missing.");
    process.exit(1);
}

/* =========================================================
   CLIENT
========================================================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message
    ]
});

/* =========================================================
   DATA STORAGE
========================================================= */

const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
        recursive: true
    });
}

const WARNINGS_FILE = path.join(
    DATA_DIR,
    "warnings.json"
);

const CONFIG_FILE = path.join(
    DATA_DIR,
    "config.json"
);

const APPLICATIONS_FILE = path.join(
    DATA_DIR,
    "applications.json"
);

function loadJSON(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(
                file,
                JSON.stringify(
                    fallback,
                    null,
                    2
                )
            );

            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(
                file,
                "utf8"
            )
        );
    } catch (error) {
        console.error(
            `Failed to load ${file}:`,
            error
        );

        return fallback;
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(
            file,
            JSON.stringify(
                data,
                null,
                2
            )
        );
    } catch (error) {
        console.error(
            `Failed to save ${file}:`,
            error
        );
    }
}

const warnings = loadJSON(
    WARNINGS_FILE,
    {}
);

const configs = loadJSON(
    CONFIG_FILE,
    {}
);

const applications = loadJSON(
    APPLICATIONS_FILE,
    {}
);

const embedSessions = new Map();

/*
    Temporary enrolment sessions.

    These contain the answers while the applicant
    is completing the questionnaire.
*/
const enrolSessions = new Map();

/* =========================================================
   EMBEDS
========================================================= */

function brandedTitle(title) {
    return `${RSA_LOGO} ${title}`;
}

function createEmbed(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOUR);

    if (options.title) {
        embed.setTitle(
            brandedTitle(
                options.title
            )
        );
    }

    if (options.description) {
        embed.setDescription(
            options.description
        );
    }

    if (options.fields?.length) {
        embed.addFields(
            options.fields
        );
    }

    if (options.thumbnail) {
        embed.setThumbnail(
            options.thumbnail
        );
    }

    if (options.image) {
        embed.setImage(
            options.image
        );
    }

    if (options.footer) {
        embed.setFooter({
            text: options.footer
        });
    }

    if (options.timestamp !== false) {
        embed.setTimestamp();
    }

    return embed;
}

/* =========================================================
   COMMANDS
========================================================= */

const commands = [

    /* =========================
       GENERAL
    ========================= */

    new SlashCommandBuilder()
        .setName("help")
        .setDescription(
            "View RSA Utility commands."
        ),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription(
            "Check the bot's latency."
        ),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription(
            "View information about RSA Utility."
        ),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription(
            "View information about this server."
        ),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription(
            "View information about a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to inspect."
                )
                .setRequired(false)
        ),

    /* =========================
       SCHOOL ENROLMENT
    ========================= */

    new SlashCommandBuilder()
        .setName("enrolschool")
        .setDescription(
            "Apply to enrol your school with the Roblox Schools Association."
        ),

    new SlashCommandBuilder()
        .setName("enrolconfig")
        .setDescription(
            "Configure the RSA school enrolment system."
        ),

    /* =========================
       MODERATION
    ========================= */

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription(
            "Ban a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to ban."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason for the ban."
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription(
            "Kick a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to kick."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason for the kick."
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription(
            "Timeout a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to timeout."
                )
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription(
                    "Timeout duration in minutes."
                )
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason for the timeout."
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription(
            "Remove a member's timeout."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription(
            "Warn a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason for the warning."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription(
            "View a member's warnings."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription(
            "Clear a member's warnings."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription(
            "Delete recent messages."
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription(
                    "Number of messages to delete."
                )
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription(
            "Lock the current channel."
        ),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription(
            "Unlock the current channel."
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription(
            "Set channel slowmode."
        )
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription(
                    "Slowmode duration."
                )
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true)
        ),

    /* =========================
       ROLES
    ========================= */

    new SlashCommandBuilder()
        .setName("role")
        .setDescription(
            "Manage member roles."
        )
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription(
                    "Add a role to a member."
                )
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription(
                            "Member."
                        )
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription(
                            "Role."
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription(
                    "Remove a role from a member."
                )
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription(
                            "Member."
                        )
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription(
                            "Role."
                        )
                        .setRequired(true)
                )
        ),

    /* =========================
       ANNOUNCEMENTS
    ========================= */

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription(
            "Send an RSA announcement."
        )
        .addStringOption(option =>
            option
                .setName("title")
                .setDescription(
                    "Announcement title."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription(
                    "Announcement message."
                )
                .setRequired(true)
        ),

    /* =========================
       EMBEDS
    ========================= */

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription(
            "Open the RSA Utility embed creator."
        ),

    /* =========================
       TICKETS
    ========================= */

    new SlashCommandBuilder()
        .setName("ticketsetup")
        .setDescription(
            "Configure the RSA Utility ticket system."
        )
        .addChannelOption(option =>
            option
                .setName("category")
                .setDescription(
                    "Category where tickets are created."
                )
                .addChannelTypes(
                    ChannelType.GuildCategory
                )
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("panel")
                .setDescription(
                    "Channel where the ticket panel is sent."
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("logs")
                .setDescription(
                    "Channel where ticket transcripts are sent."
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName("support")
                .setDescription(
                    "Role that manages tickets."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription(
            "View the ticket system configuration."
        )

].map(command =>
    command.toJSON()
);

/* =========================================================
   REGISTER COMMANDS
========================================================= */

async function registerCommands() {

    const rest = new REST({
        version: "10"
    }).setToken(TOKEN);

    console.log(
        "Registering RSA Utility commands..."
    );

    await rest.put(
        Routes.applicationGuildCommands(
            CLIENT_ID,
            GUILD_ID
        ),
        {
            body: commands
        }
    );

    console.log(
        `Registered ${commands.length} commands.`
    );
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

function isEnrolStaff(interaction) {

    const config =
        configs[
            interaction.guild.id
        ]?.enrolment;

    if (!config?.staffRole) {
        return (
            hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            ) ||
            interaction.guild.ownerId ===
                interaction.user.id
        );
    }

    return (
        interaction.member.roles.cache.has(
            config.staffRole
        ) ||
        hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageGuild
        ) ||
        interaction.guild.ownerId ===
            interaction.user.id
    );
}

function isTicketStaff(interaction) {

    const config =
        configs[
            interaction.guild.id
        ]?.ticket;

    if (!config?.supportRole) {
        return (
            hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            ) ||
            interaction.guild.ownerId ===
                interaction.user.id
        );
    }

    return (
        interaction.member.roles.cache.has(
            config.supportRole
        ) ||
        hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageChannels
        ) ||
        interaction.guild.ownerId ===
            interaction.user.id
    );
}

function canModerate(
    interaction,
    member
) {

    if (!member) {
        return false;
    }

    if (
        member.id ===
        interaction.user.id
    ) {
        return false;
    }

    if (
        member.id ===
        interaction.guild.ownerId
    ) {
        return false;
    }

    if (
        interaction.user.id !==
        interaction.guild.ownerId
    ) {

        if (
            member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {
            return false;
        }
    }

    const botMember =
        interaction.guild.members.me;

    if (
        botMember &&
        member.roles.highest.position >=
            botMember.roles.highest.position
    ) {
        return false;
    }

    return true;
}

/* =========================================================
   TICKET LOGGING
========================================================= */

async function sendTicketLog(
    guild,
    embed,
    file = null
) {

    const config =
        configs[guild.id]?.ticket;

    if (!config?.logsChannel) {
        return;
    }

    const channel =
        guild.channels.cache.get(
            config.logsChannel
        );

    if (!channel) {
        return;
    }

    const payload = {
        embeds: [
            embed
        ]
    };

    if (file) {
        payload.files = [
            file
        ];
    }

    await channel.send(
        payload
    ).catch(() => {});
}

/* =========================================================
   READY
========================================================= */

client.once(
    "ready",
    async () => {

        console.log(
            `${BOT_NAME} is online as ${client.user.tag}`
        );

        client.user.setPresence({
            status: "online",
            activities: [
                {
                    name: "RSA Utility",
                    type: ActivityType.Watching
                }
            ]
        });

        try {

            await registerCommands();

        } catch (error) {

            console.error(
                "Command registration failed:",
                error
            );
        }
    }
);

/* =========================================================
   INTERACTION ROUTER
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
                content:
                    "Something went wrong while processing that action.",
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

    /* =====================================================
       HELP
    ===================================================== */

    if (command === "help") {

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "RSA Utility Commands",
                    description:
                        "RSA Utility provides moderation, management, support and school enrolment tools.",
                    fields: [

                        {
                            name:
                                "General",
                            value:
                                "`/help` `/ping` `/botinfo` `/serverinfo` `/userinfo`"
                        },

                        {
                            name:
                                "School Enrolment",
                            value:
                                "`/enrolschool` — Start a school enrolment application.\n`/enrolconfig` — Configure the enrolment review system."
                        },

                        {
                            name:
                                "Moderation",
                            value:
                                "`/ban` `/kick` `/timeout` `/untimeout`\n`/warn` `/warnings` `/clearwarnings` `/purge`"
                        },

                        {
                            name:
                                "Channel Management",
                            value:
                                "`/lock` `/unlock` `/slowmode`"
                        },

                        {
                            name:
                                "Roles",
                            value:
                                "`/role add` `/role remove`"
                        },

                        {
                            name:
                                "Utilities",
                            value:
                                "`/announce` `/embed`"
                        },

                        {
                            name:
                                "Tickets",
                            value:
                                "`/ticketsetup` `/ticketconfig`"
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       PING
    ===================================================== */

    if (command === "ping") {

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Bot Status",
                    description:
                        `Pong! Current WebSocket latency: **${client.ws.ping}ms**`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       BOT INFO
    ===================================================== */

    if (command === "botinfo") {

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "RSA Utility",
                    description:
                        "RSA Utility provides moderation, management, information, support and school enrolment tools.",
                    fields: [
                        {
                            name:
                                "Version",
                            value:
                                BOT_VERSION,
                            inline: true
                        },
                        {
                            name:
                                "Latency",
                            value:
                                `${client.ws.ping}ms`,
                            inline: true
                        },
                        {
                            name:
                                "Servers",
                            value:
                                `${client.guilds.cache.size}`,
                            inline: true
                        },
                        {
                            name:
                                "Commands",
                            value:
                                `${commands.length}`,
                            inline: true
                        }
                    ],
                    footer:
                        "Roblox Schools Association"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       SERVER INFO
    ===================================================== */

    if (command === "serverinfo") {

        const guild =
            interaction.guild;

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Server Information",
                    thumbnail:
                        guild.iconURL({
                            size: 256
                        }),
                    fields: [
                        {
                            name:
                                "Server",
                            value:
                                guild.name,
                            inline: true
                        },
                        {
                            name:
                                "Members",
                            value:
                                `${guild.memberCount}`,
                            inline: true
                        },
                        {
                            name:
                                "Channels",
                            value:
                                `${guild.channels.cache.size}`,
                            inline: true
                        },
                        {
                            name:
                                "Roles",
                            value:
                                `${guild.roles.cache.size}`,
                            inline: true
                        },
                        {
                            name:
                                "Owner",
                            value:
                                `<@${guild.ownerId}>`,
                            inline: true
                        },
                        {
                            name:
                                "Created",
                            value:
                                `<t:${Math.floor(
                                    guild.createdTimestamp / 1000
                                )}:F>`
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       USER INFO
    ===================================================== */

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
                    .slice(0, 15)
                    .join(" ") ||
                    "No roles"
                : "Not in server";

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "User Information",
                    thumbnail:
                        user.displayAvatarURL({
                            size: 256
                        }),
                    fields: [
                        {
                            name:
                                "User",
                            value:
                                user.tag
                        },
                        {
                            name:
                                "User ID",
                            value:
                                user.id
                        },
                        {
                            name:
                                "Account Created",
                            value:
                                `<t:${Math.floor(
                                    user.createdTimestamp / 1000
                                )}:F>`
                        },
                        {
                            name:
                                "Joined Server",
                            value:
                                member?.joinedTimestamp
                                    ? `<t:${Math.floor(
                                        member.joinedTimestamp / 1000
                                    )}:F>`
                                    : "Not in server"
                        },
                        {
                            name:
                                "Roles",
                            value:
                                roles
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       ENROL SCHOOL
    ===================================================== */

    if (command === "enrolschool") {

        return startEnrolment(
            interaction
        );
    }

    /* =====================================================
       ENROL CONFIG
    ===================================================== */

    if (command === "enrolconfig") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Server permission to configure school enrolments.",
                ephemeral: true
            });
        }

        return showEnrolConfigPanel(
            interaction
        );
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
                content:
                    "You need the Ban Members permission.",
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

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            member &&
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "You cannot ban this member because of the role hierarchy.",
                ephemeral: true
            });
        }

        await interaction.guild.members.ban(
            user.id,
            {
                reason
            }
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Member Banned",
                    description:
                        `**${user.tag}** has been banned.`,
                    fields: [
                        {
                            name:
                                "Reason",
                            value:
                                reason
                        },
                        {
                            name:
                                "Moderator",
                            value:
                                interaction.user.toString()
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ]
        });
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
                content:
                    "You need the Kick Members permission.",
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

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "You cannot kick this member.",
                ephemeral: true
            });
        }

        await member.kick(
            reason
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Member Kicked",
                    description:
                        `**${user.tag}** has been kicked.`,
                    fields: [
                        {
                            name:
                                "Reason",
                            value:
                                reason
                        },
                        {
                            name:
                                "Moderator",
                            value:
                                interaction.user.toString()
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ]
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
                content:
                    "You need the Moderate Members permission.",
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
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "You cannot timeout this member.",
                ephemeral: true
            });
        }

        await member.timeout(
            minutes * 60 * 1000,
            reason
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Member Timed Out",
                    description:
                        `**${user.tag}** has been timed out.`,
                    fields: [
                        {
                            name:
                                "Duration",
                            value:
                                `${minutes} minute(s)`
                        },
                        {
                            name:
                                "Reason",
                            value:
                                reason
                        },
                        {
                            name:
                                "Moderator",
                            value:
                                interaction.user.toString()
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ]
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
                content:
                    "You need the Moderate Members permission.",
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
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "You cannot modify this member.",
                ephemeral: true
            });
        }

        await member.timeout(
            null,
            `Timeout removed by ${interaction.user.tag}`
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Timeout Removed",
                    description:
                        `The timeout has been removed from **${user.tag}**.`,
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       WARN
    ===================================================== */

    if (command === "warn") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
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

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "You cannot warn this member.",
                ephemeral: true
            });
        }

        const key =
            `${interaction.guild.id}:${user.id}`;

        if (!warnings[key]) {
            warnings[key] = [];
        }

        warnings[key].push({
            reason,
            moderator:
                interaction.user.id,
            timestamp:
                Date.now()
        });

        saveJSON(
            WARNINGS_FILE,
            warnings
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Member Warned",
                    description:
                        `**${user.tag}** has been warned.`,
                    fields: [
                        {
                            name:
                                "Reason",
                            value:
                                reason
                        },
                        {
                            name:
                                "Moderator",
                            value:
                                interaction.user.toString()
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       WARNINGS
    ===================================================== */

    if (command === "warnings") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const key =
            `${interaction.guild.id}:${user.id}`;

        const list =
            warnings[key] || [];

        if (!list.length) {

            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Warnings",
                        description:
                            `**${user.tag}** has no warnings.`,
                        footer:
                            "RSA Utility"
                    })
                ],
                ephemeral: true
            });
        }

        const description =
            list
                .map(
                    (item, index) =>
                        `**${index + 1}.** ${item.reason}\n` +
                        `Moderator: <@${item.moderator}>\n` +
                        `<t:${Math.floor(
                            item.timestamp / 1000
                        )}:R>`
                )
                .join("\n\n");

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        `Warnings — ${user.tag}`,
                    description:
                        description.slice(
                            0,
                            4000
                        ),
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       CLEAR WARNINGS
    ===================================================== */

    if (command === "clearwarnings") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const key =
            `${interaction.guild.id}:${user.id}`;

        delete warnings[key];

        saveJSON(
            WARNINGS_FILE,
            warnings
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Warnings Cleared",
                    description:
                        `All warnings for **${user.tag}** have been cleared.`,
                    footer:
                        "RSA Utility"
                })
            ]
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
                content:
                    "You need the Manage Messages permission.",
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
                createEmbed({
                    title:
                        "Messages Purged",
                    description:
                        `Deleted **${deleted.size}** message(s).`,
                    footer:
                        "RSA Utility"
                })
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
                content:
                    "You need the Manage Channels permission.",
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
                createEmbed({
                    title:
                        "Channel Locked",
                    description:
                        "This channel has been locked.",
                    footer:
                        "RSA Utility"
                })
            ]
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
                content:
                    "You need the Manage Channels permission.",
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
                createEmbed({
                    title:
                        "Channel Unlocked",
                    description:
                        "This channel has been unlocked.",
                    footer:
                        "RSA Utility"
                })
            ]
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
                content:
                    "You need the Manage Channels permission.",
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
                createEmbed({
                    title:
                        "Slowmode Updated",
                    description:
                        seconds === 0
                            ? "Slowmode has been disabled."
                            : `Slowmode is now set to **${seconds} seconds**.`,
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       ROLE
    ===================================================== */

    if (command === "role") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageRoles
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Roles permission.",
                ephemeral: true
            });
        }

        const subcommand =
            interaction.options.getSubcommand();

        const user =
            interaction.options.getUser(
                "user"
            );

        const role =
            interaction.options.getRole(
                "role"
            );

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member) {

            return interaction.reply({
                content:
                    "Member not found.",
                ephemeral: true
            });
        }

        if (
            role.position >=
            interaction.member.roles.highest.position &&
            interaction.user.id !==
                interaction.guild.ownerId
        ) {

            return interaction.reply({
                content:
                    "You cannot manage that role.",
                ephemeral: true
            });
        }

        const botMember =
            interaction.guild.members.me;

        if (
            botMember &&
            role.position >=
                botMember.roles.highest.position
        ) {

            return interaction.reply({
                content:
                    "My bot role is not high enough to manage that role.",
                ephemeral: true
            });
        }

        if (subcommand === "add") {

            await member.roles.add(
                role
            );

            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Role Added",
                        description:
                            `Added ${role} to **${user.tag}**.`,
                        footer:
                            "RSA Utility"
                    })
                ]
            });
        }

        await member.roles.remove(
            role
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Role Removed",
                    description:
                        `Removed ${role} from **${user.tag}**.`,
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       ANNOUNCE
    ===================================================== */

    if (command === "announce") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        const title =
            interaction.options.getString(
                "title"
            );

        const message =
            interaction.options.getString(
                "message"
            );

        await interaction.channel.send({
            embeds: [
                createEmbed({
                    title,
                    description:
                        message,
                    footer:
                        "Roblox Schools Association"
                })
            ]
        });

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Announcement Sent",
                    description:
                        "The announcement has been sent.",
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       EMBED CREATOR
    ===================================================== */

    if (command === "embed") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        embedSessions.set(
            interaction.user.id,
            {
                title:
                    "RSA Announcement",
                description:
                    "",
                footer:
                    "Roblox Schools Association",
                image:
                    "",
                thumbnail:
                    "",
                fields:
                    []
            }
        );

        return showEmbedBuilder(
            interaction
        );
    }

    /* =====================================================
       TICKET SETUP
    ===================================================== */

    if (command === "ticketsetup") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const category =
            interaction.options.getChannel(
                "category"
            );

        const panel =
            interaction.options.getChannel(
                "panel"
            );

        const logs =
            interaction.options.getChannel(
                "logs"
            );

        const support =
            interaction.options.getRole(
                "support"
            );

        configs[
            interaction.guild.id
        ] = {
            ...(
                configs[
                    interaction.guild.id
                ] || {}
            ),
            ticket: {
                category:
                    category.id,
                panelChannel:
                    panel.id,
                logsChannel:
                    logs.id,
                supportRole:
                    support.id
            }
        };

        saveJSON(
            CONFIG_FILE,
            configs
        );

        const panelEmbed =
            createEmbed({
                title:
                    "RSA Support",
                description:
                    "Need assistance? Click the button below to open a private support ticket.\n\nA member of the support team will assist you as soon as possible.",
                footer:
                    "Roblox Schools Association"
            });

        const row =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_create"
                        )
                        .setLabel(
                            "Create Ticket"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        )
                );

        await panel.send({
            embeds: [
                panelEmbed
            ],
            components: [
                row
            ]
        });

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Ticket System Configured",
                    description:
                        "The RSA Utility ticket system has been configured successfully.",
                    fields: [
                        {
                            name:
                                "Category",
                            value:
                                category.toString()
                        },
                        {
                            name:
                                "Panel Channel",
                            value:
                                panel.toString()
                        },
                        {
                            name:
                                "Logs Channel",
                            value:
                                logs.toString()
                        },
                        {
                            name:
                                "Support Role",
                            value:
                                support.toString()
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       TICKET CONFIG
    ===================================================== */

    if (command === "ticketconfig") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const ticket =
            configs[
                interaction.guild.id
            ]?.ticket;

        if (!ticket) {

            return interaction.reply({
                content:
                    "The ticket system has not been configured yet.",
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Ticket Configuration",
                    fields: [
                        {
                            name:
                                "Category",
                            value:
                                `<#${ticket.category}>`
                        },
                        {
                            name:
                                "Panel Channel",
                            value:
                                `<#${ticket.panelChannel}>`
                        },
                        {
                            name:
                                "Logs Channel",
                            value:
                                `<#${ticket.logsChannel}>`
                        },
                        {
                            name:
                                "Support Role",
                            value:
                                `<@&${ticket.supportRole}>`
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   SCHOOL ENROLMENT SYSTEM
========================================================= */

async function startEnrolment(
    interaction
) {

    const guild =
        interaction.guild;

    const config =
        configs[
            guild.id
        ]?.enrolment;

    if (
        !config?.reviewCategory ||
        !config?.staffRole
    ) {

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Not Configured",
                    description:
                        "The school enrolment system has not been configured yet.\n\nPlease ask a server administrator to run `/enrolconfig`.",
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    const existing =
        applications[
            `${guild.id}:${interaction.user.id}`
        ];

    if (
        existing &&
        (
            existing.status === "pending" ||
            existing.status === "changes"
        )
    ) {

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Existing Application",
                    description:
                        "You already have an active school enrolment application.\n\nPlease wait for staff to review it or complete any requested changes.",
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    const dm =
        await interaction.user.createDM()
            .catch(() => null);

    if (!dm) {

        return interaction.reply({
            content:
                "I could not send you a DM. Please enable Direct Messages from server members and try again.",
            ephemeral: true
        });
    }

    enrolSessions.set(
        `${guild.id}:${interaction.user.id}`,
        {
            guildId:
                guild.id,
            userId:
                interaction.user.id,
            answers: {},
            stage:
                1
        }
    );

    const embed =
        createEmbed({
            title:
                "School Enrolment",
            description:
                "Welcome to the RSA school enrolment process.\n\nYour questionnaire will be completed privately through DMs.\n\nYou will be asked **6 questions** about your school. Once all questions are completed, you will be able to press **Submit Enrolment**.",
            footer:
                "RSA Utility"
        });

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        `enrol_start:${guild.id}`
                    )
                    .setLabel(
                        "Start Questionnaire"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    )
            );

    await dm.send({
        embeds: [
            embed
        ],
        components: [
            row
        ]
    });

    return interaction.reply({
        embeds: [
            createEmbed({
                title:
                    "Check Your DMs",
                description:
                    "I've sent your school enrolment questionnaire to your DMs.",
                footer:
                    "RSA Utility"
            })
        ],
        ephemeral: true
    });
}

/* =========================================================
   ENROL CONFIG PANEL
========================================================= */

async function showEnrolConfigPanel(
    interaction
) {

    const config =
        configs[
            interaction.guild.id
        ]?.enrolment;

    const category =
        config?.reviewCategory
            ? `<#${config.reviewCategory}>`
            : "Not configured";

    const staff =
        config?.staffRole
            ? `<@&${config.staffRole}>`
            : "Not configured";

    const embed =
        createEmbed({
            title:
                "School Enrolment Configuration",
            description:
                "Use the buttons below to configure where school enrolment applications are reviewed and which staff role can access them.",
            fields: [
                {
                    name:
                        "Review Category",
                    value:
                        category,
                    inline: true
                },
                {
                    name:
                        "Staff Role",
                    value:
                        staff,
                    inline: true
                }
            ],
            footer:
                "RSA Utility"
        });

    const row =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "enrolconfig_category"
                    )
                    .setLabel(
                        "Set Review Category"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "enrolconfig_staff"
                    )
                    .setLabel(
                        "Set Staff Role"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    )
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "enrolconfig_view"
                    )
                    .setLabel(
                        "Refresh Configuration"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "enrolconfig_disable"
                    )
                    .setLabel(
                        "Disable Enrolment"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    return interaction.reply({
        embeds: [
            embed
        ],
        components: [
            row,
            row2
        ],
        ephemeral: true
    });
}

/* =========================================================
   ENROLMENT EMBED
========================================================= */

function buildApplicationEmbed(
    application
) {

    return createEmbed({
        title:
            "School Enrolment Application",
        description:
            "A school enrolment application has been submitted for staff review.",
        fields: [

            {
                name:
                    "Applicant",
                value:
                    `<@${application.userId}>`,
                inline: true
            },

            {
                name:
                    "Status",
                value:
                    application.status,
                inline: true
            },

            {
                name:
                    "School's Name",
                value:
                    application.answers.schoolName ||
                    "Not provided"
            },

            {
                name:
                    "School Description",
                value:
                    application.answers.description ||
                    "Not provided"
            },

            {
                name:
                    "School Discord Server",
                value:
                    application.answers.invite ||
                    "Not provided"
            },

            {
                name:
                    "School Owner / Headteacher",
                value:
                    application.answers.owner ||
                    "Not provided"
            },

            {
                name:
                    "Why should the school be enrolled?",
                value:
                    application.answers.reason ||
                    "Not provided"
            },

            {
                name:
                    "Additional Information",
                value:
                    application.answers.additional ||
                    "None provided"
            }
        ],
        footer:
            `RSA Utility • Application submitted by ${application.username}`
    });
}

/* =========================================================
   ENROLMENT BUTTONS
========================================================= */

function applicationButtons(
    disabled = false
) {

    return new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId(
                    "application_approve"
                )
                .setLabel(
                    "Approve"
                )
                .setStyle(
                    ButtonStyle.Success
                )
                .setDisabled(
                    disabled
                ),

            new ButtonBuilder()
                .setCustomId(
                    "application_deny"
                )
                .setLabel(
                    "Deny"
                )
                .setStyle(
                    ButtonStyle.Danger
                )
                .setDisabled(
                    disabled
                ),

            new ButtonBuilder()
                .setCustomId(
                    "application_changes"
                )
                .setLabel(
                    "Request Changes"
                )
                .setStyle(
                    ButtonStyle.Secondary
                )
                .setDisabled(
                    disabled
                )
        );
}

/* =========================================================
   CREATE REVIEW CHANNEL
========================================================= */

async function createReviewChannel(
    guild,
    application
) {

    const config =
        configs[
            guild.id
        ]?.enrolment;

    if (
        !config?.reviewCategory ||
        !config?.staffRole
    ) {
        throw new Error(
            "Enrolment system is not configured."
        );
    }

    const category =
        guild.channels.cache.get(
            config.reviewCategory
        );

    const staffRole =
        guild.roles.cache.get(
            config.staffRole
        );

    if (!category) {
        throw new Error(
            "Review category does not exist."
        );
    }

    if (!staffRole) {
        throw new Error(
            "Staff role does not exist."
        );
    }

    const safeName =
        application.username
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                "-"
            )
            .replace(
                /-+/g,
                "-"
            )
            .replace(
                /^-|-$/g,
                ""
            )
            .slice(
                0,
                35
            ) ||
        "applicant";

    const existing =
        guild.channels.cache.find(
            channel =>
                channel.type ===
                    ChannelType.GuildText &&
                channel.topic ===
                    `enrol-applicant:${application.userId}`
        );

    if (existing) {
        return existing;
    }

    const channel =
        await guild.channels.create({
            name:
                `application-${safeName}`,
            type:
                ChannelType.GuildText,
            parent:
                category.id,
            topic:
                `enrol-applicant:${application.userId}`,
            permissionOverwrites: [

                {
                    id:
                        guild.roles.everyone.id,
                    deny: [
                        PermissionsBitField.Flags.ViewChannel
                    ]
                },

                {
                    id:
                        staffRole.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },

                {
                    id:
                        client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.ManageMessages
                    ]
                }
            ]
        });

    return channel;
}

/* =========================================================
   HANDLE ENROLMENT BUTTONS
========================================================= */

async function handleEnrolButton(
    interaction
) {

    const customId =
        interaction.customId;

    /* =====================================================
       START QUESTIONNAIRE
    ===================================================== */

    if (
        customId.startsWith(
            "enrol_start:"
        )
    ) {

        const guildId =
            customId.split(":")[1];

        const key =
            `${guildId}:${interaction.user.id}`;

        let session =
            enrolSessions.get(
                key
            );

        if (!session) {

            session = {
                guildId,
                userId:
                    interaction.user.id,
                answers: {},
                stage:
                    1
            };

            enrolSessions.set(
                key,
                session
            );
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `enrol_questions_1:${guildId}`
                )
                .setTitle(
                    "School Enrolment — Part 1"
                );

        const schoolName =
            new TextInputBuilder()
                .setCustomId(
                    "schoolName"
                )
                .setLabel(
                    "What is your School's Name?"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(100);

        const description =
            new TextInputBuilder()
                .setCustomId(
                    "description"
                )
                .setLabel(
                    "What is the Description for your school?"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000);

        const invite =
            new TextInputBuilder()
                .setCustomId(
                    "invite"
                )
                .setLabel(
                    "What is your School's Discord Server Invite?"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(200);

        const owner =
            new TextInputBuilder()
                .setCustomId(
                    "owner"
                )
                .setLabel(
                    "Who is the School Owner / Headteacher?"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(100);

        const reason =
            new TextInputBuilder()
                .setCustomId(
                    "reason"
                )
                .setLabel(
                    "Why should your school be enrolled?"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    schoolName
                ),
            new ActionRowBuilder()
                .addComponents(
                    description
                ),
            new ActionRowBuilder()
                .addComponents(
                    invite
                ),
            new ActionRowBuilder()
                .addComponents(
                    owner
                ),
            new ActionRowBuilder()
                .addComponents(
                    reason
                )
        );

        return interaction.showModal(
            modal
        );
    }

    /* =====================================================
       FINAL SUBMIT BUTTON
    ===================================================== */

    if (
        customId ===
        "enrol_submit"
    ) {

        const session =
            enrolSessions.get(
                `${interaction.guildId}:${interaction.user.id}`
            );

        if (!session) {

            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Enrolment Session Expired",
                        description:
                            "Your questionnaire session has expired. Please run `/enrolschool` again.",
                        footer:
                            "RSA Utility"
                    })
                ],
                ephemeral: true
            });
        }

        if (
            !session.answers.additional
        ) {

            return interaction.reply({
                content:
                    "Please complete all questions before submitting your enrolment.",
                ephemeral: true
            });
        }

        await interaction.deferReply({
            ephemeral: true
        });

        const applicationKey =
            `${interaction.guildId}:${interaction.user.id}`;

        const application = {
            guildId:
                interaction.guildId,
            userId:
                interaction.user.id,
            username:
                interaction.user.username,
            status:
                "pending",
            submittedAt:
                Date.now(),
            answers:
                session.answers
        };

        applications[
            applicationKey
        ] = application;

        saveJSON(
            APPLICATIONS_FILE,
            applications
        );

        try {

            const guild =
                interaction.client.guilds.cache.get(
                    interaction.guildId
                );

            const reviewChannel =
                await createReviewChannel(
                    guild,
                    application
                );

            application.reviewChannel =
                reviewChannel.id;

            saveJSON(
                APPLICATIONS_FILE,
                applications
            );

            await reviewChannel.send({
                content:
                    `<@&${configs[interaction.guildId].enrolment.staffRole}>`,
                embeds: [
                    buildApplicationEmbed(
                        application
                    )
                ],
                components: [
                    applicationButtons()
                ]
            });

            await interaction.editReply({
                embeds: [
                    createEmbed({
                        title:
                            "Enrolment Submitted",
                        description:
                            "Your school enrolment has been submitted successfully.\n\nThe RSA team will now review your application. You will receive a DM when a decision has been made or if changes are required.",
                        footer:
                            "RSA Utility"
                    })
                ]
            });

            enrolSessions.delete(
                applicationKey
            );

        } catch (error) {

            console.error(
                "Failed to create application channel:",
                error
            );

            delete applications[
                applicationKey
            ];

            saveJSON(
                APPLICATIONS_FILE,
                applications
            );

            return interaction.editReply({
                embeds: [
                    createEmbed({
                        title:
                            "Submission Failed",
                        description:
                            "I couldn't create the application review channel. Please contact a server administrator.",
                        footer:
                            "RSA Utility"
                    })
                ]
            });
        }

        return;
    }

    /* =====================================================
       RESUBMIT
    ===================================================== */

    if (
        customId ===
        "enrol_resubmit"
    ) {

        const application =
            applications[
                `${interaction.guildId}:${interaction.user.id}`
            ];

        if (!application) {

            return interaction.reply({
                content:
                    "No application was found.",
                ephemeral: true
            });
        }

        enrolSessions.set(
            `${interaction.guildId}:${interaction.user.id}`,
            {
                guildId:
                    interaction.guildId,
                userId:
                    interaction.user.id,
                answers: {
                    ...application.answers
                },
                stage:
                    1
            }
        );

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `enrol_questions_1:${interaction.guildId}`
                )
                .setTitle(
                    "School Enrolment — Part 1"
                );

        const schoolName =
            new TextInputBuilder()
                .setCustomId(
                    "schoolName"
                )
                .setLabel(
                    "What is your School's Name?"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(100)
                .setValue(
                    application.answers.schoolName ||
                    ""
                );

        const description =
            new TextInputBuilder()
                .setCustomId(
                    "description"
                )
                .setLabel(
                    "What is the Description for your school?"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000)
                .setValue(
                    application.answers.description ||
                    ""
                );

        const invite =
            new TextInputBuilder()
                .setCustomId(
                    "invite"
                )
                .setLabel(
                    "What is your School's Discord Server Invite?"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(200)
                .setValue(
                    application.answers.invite ||
                    ""
                );

        const owner =
            new TextInputBuilder()
                .setCustomId(
                    "owner"
                )
                .setLabel(
                    "Who is the School Owner / Headteacher?"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(100)
                .setValue(
                    application.answers.owner ||
                    ""
                );

        const reason =
            new TextInputBuilder()
                .setCustomId(
                    "reason"
                )
                .setLabel(
                    "Why should your school be enrolled?"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000)
                .setValue(
                    application.answers.reason ||
                    ""
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    schoolName
                ),
            new ActionRowBuilder()
                .addComponents(
                    description
                ),
            new ActionRowBuilder()
                .addComponents(
                    invite
                ),
            new ActionRowBuilder()
                .addComponents(
                    owner
                ),
            new ActionRowBuilder()
                .addComponents(
                    reason
                )
        );

        return interaction.showModal(
            modal
        );
    }
}

/* =========================================================
   ENROLMENT MODAL HANDLER
========================================================= */

async function handleEnrolModal(
    interaction
) {

    if (
        interaction.customId.startsWith(
            "enrol_questions_1:"
        )
    ) {

        const guildId =
            interaction.customId.split(":")[1];

        const key =
            `${guildId}:${interaction.user.id}`;

        const session =
            enrolSessions.get(
                key
            );

        if (!session) {

            return interaction.reply({
                content:
                    "Your enrolment session has expired. Please run `/enrolschool` again.",
                ephemeral: true
            });
        }

        session.answers.schoolName =
            interaction.fields.getTextInputValue(
                "schoolName"
            );

        session.answers.description =
            interaction.fields.getTextInputValue(
                "description"
            );

        session.answers.invite =
            interaction.fields.getTextInputValue(
                "invite"
            );

        session.answers.owner =
            interaction.fields.getTextInputValue(
                "owner"
            );

        session.answers.reason =
            interaction.fields.getTextInputValue(
                "reason"
            );

        session.stage =
            2;

        enrolSessions.set(
            key,
            session
        );

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `enrol_questions_2:${guildId}`
                )
                .setTitle(
                    "School Enrolment — Part 2"
                );

        const additional =
            new TextInputBuilder()
                .setCustomId(
                    "additional"
                )
                .setLabel(
                    "Any additional information?"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(false)
                .setMaxLength(1500);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    additional
                )
        );

        return interaction.showModal(
            modal
        );
    }

    if (
        interaction.customId.startsWith(
            "enrol_questions_2:"
        )
    ) {

        const guildId =
            interaction.customId.split(":")[1];

        const key =
            `${guildId}:${interaction.user.id}`;

        const session =
            enrolSessions.get(
                key
            );

        if (!session) {

            return interaction.reply({
                content:
                    "Your enrolment session has expired. Please run `/enrolschool` again.",
                ephemeral: true
            });
        }

        session.answers.additional =
            interaction.fields.getTextInputValue(
                "additional"
            ) ||
            "None provided.";

        enrolSessions.set(
            key,
            session
        );

        const preview =
            createEmbed({
                title:
                    "Review Your Enrolment",
                description:
                    "Please review your answers below. If everything is correct, press **Submit Enrolment**.",
                fields: [

                    {
                        name:
                            "School's Name",
                        value:
                            session.answers.schoolName
                    },

                    {
                        name:
                            "School Description",
                        value:
                            session.answers.description
                    },

                    {
                        name:
                            "Discord Server Invite",
                        value:
                            session.answers.invite
                    },

                    {
                        name:
                            "School Owner / Headteacher",
                        value:
                            session.answers.owner
                    },

                    {
                        name:
                            "Why should the school be enrolled?",
                        value:
                            session.answers.reason
                    },

                    {
                        name:
                            "Additional Information",
                        value:
                            session.answers.additional
                    }
                ],
                footer:
                    "RSA Utility"
            });

        const row =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "enrol_submit"
                        )
                        .setLabel(
                            "Submit Enrolment"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "enrol_cancel"
                        )
                        .setLabel(
                            "Cancel"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        )
                );

        return interaction.reply({
            embeds: [
                preview
            ],
            components: [
                row
            ]
        });
    }
}

/* =========================================================
   ENROLMENT CONFIG MODALS
========================================================= */

async function handleEnrolConfigModal(
    interaction
) {

    if (
        interaction.customId ===
        "enrolconfig_category_modal"
    ) {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const categoryId =
            interaction.fields
                .getTextInputValue(
                    "category_id"
                )
                .trim();

        const category =
            interaction.guild.channels.cache.get(
                categoryId
            );

        if (
            !category ||
            category.type !==
                ChannelType.GuildCategory
        ) {

            return interaction.reply({
                content:
                    "That is not a valid category in this server.",
                ephemeral: true
            });
        }

        if (
            !configs[
                interaction.guild.id
            ]
        ) {
            configs[
                interaction.guild.id
            ] = {};
        }

        configs[
            interaction.guild.id
        ].enrolment = {
            ...(
                configs[
                    interaction.guild.id
                ].enrolment || {}
            ),
            reviewCategory:
                category.id
        };

        saveJSON(
            CONFIG_FILE,
            configs
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Review Category Updated",
                    description:
                        `School applications will now be created in ${category}.`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    if (
        interaction.customId ===
        "enrolconfig_staff_modal"
    ) {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const roleId =
            interaction.fields
                .getTextInputValue(
                    "staff_role_id"
                )
                .trim();

        const role =
            interaction.guild.roles.cache.get(
                roleId
            );

        if (!role) {

            return interaction.reply({
                content:
                    "That role does not exist in this server.",
                ephemeral: true
            });
        }

        if (
            !configs[
                interaction.guild.id
            ]
        ) {
            configs[
                interaction.guild.id
            ] = {};
        }

        configs[
            interaction.guild.id
        ].enrolment = {
            ...(
                configs[
                    interaction.guild.id
                ].enrolment || {}
            ),
            staffRole:
                role.id
        };

        saveJSON(
            CONFIG_FILE,
            configs
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Staff Role Updated",
                    description:
                        `${role} can now review school enrolment applications.`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   BUTTON HANDLER
========================================================= */

async function handleButton(
    interaction
) {

    /* =====================================================
       ENROLMENT BUTTONS
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "enrol_start:"
        ) ||
        interaction.customId ===
            "enrol_submit" ||
        interaction.customId ===
            "enrol_resubmit"
    ) {

        return handleEnrolButton(
            interaction
        );
    }

    if (
        interaction.customId ===
        "enrol_cancel"
    ) {

        enrolSessions.delete(
            `${interaction.guildId}:${interaction.user.id}`
        );

        return interaction.update({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Cancelled",
                    description:
                        "Your school enrolment application has been cancelled.",
                    footer:
                        "RSA Utility"
                })
            ],
            components: []
        });
    }

    /* =====================================================
       ENROLMENT CONFIGURATION
    ===================================================== */

    if (
        interaction.customId ===
            "enrolconfig_category" ||
        interaction.customId ===
            "enrolconfig_staff"
    ) {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        if (
            interaction.customId ===
            "enrolconfig_category"
        ) {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        "enrolconfig_category_modal"
                    )
                    .setTitle(
                        "Set Review Category"
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        "category_id"
                    )
                    .setLabel(
                        "Category Channel ID"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true)
                    .setMaxLength(30);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        input
                    )
            );

            return interaction.showModal(
                modal
            );
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "enrolconfig_staff_modal"
                )
                .setTitle(
                    "Set Enrolment Staff Role"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "staff_role_id"
                )
                .setLabel(
                    "Staff Role ID"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(30);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    input
                )
        );

        return interaction.showModal(
            modal
        );
    }

    if (
        interaction.customId ===
        "enrolconfig_view"
    ) {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const config =
            configs[
                interaction.guild.id
            ]?.enrolment;

        return interaction.update({
            embeds: [
                createEmbed({
                    title:
                        "School Enrolment Configuration",
                    description:
                        "Current RSA school enrolment configuration.",
                    fields: [
                        {
                            name:
                                "Review Category",
                            value:
                                config?.reviewCategory
                                    ? `<#${config.reviewCategory}>`
                                    : "Not configured",
                            inline: true
                        },
                        {
                            name:
                                "Staff Role",
                            value:
                                config?.staffRole
                                    ? `<@&${config.staffRole}>`
                                    : "Not configured",
                            inline: true
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    if (
        interaction.customId ===
        "enrolconfig_disable"
    ) {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        if (
            configs[
                interaction.guild.id
            ]
        ) {

            delete configs[
                interaction.guild.id
            ].enrolment;

            saveJSON(
                CONFIG_FILE,
                configs
            );
        }

        return interaction.update({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Disabled",
                    description:
                        "School enrolment has been disabled for this server.",
                    footer:
                        "RSA Utility"
                })
            ],
            components: []
        });
    }

    /* =====================================================
       APPLICATION REVIEW
    ===================================================== */

    if (
        interaction.customId ===
            "application_approve" ||
        interaction.customId ===
            "application_deny" ||
        interaction.customId ===
            "application_changes"
    ) {

        if (
            !isEnrolStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to review school enrolment applications.",
                ephemeral: true
            });
        }

        const ownerId =
            getApplicationOwner(
                interaction.channel
            );

        if (!ownerId) {

            return interaction.reply({
                content:
                    "I could not determine the applicant for this application.",
                ephemeral: true
            });
        }

        const application =
            applications[
                `${interaction.guild.id}:${ownerId}`
            ];

        if (!application) {

            return interaction.reply({
                content:
                    "Application data could not be found.",
                ephemeral: true
            });
        }

        /* =========================
           APPROVE
        ========================= */

        if (
            interaction.customId ===
            "application_approve"
        ) {

            application.status =
                "approved";

            application.reviewedBy =
                interaction.user.id;

            application.reviewedAt =
                Date.now();

            saveJSON(
                APPLICATIONS_FILE,
                applications
            );

            await interaction.update({
                embeds: [
                    createEmbed({
                        title:
                            "Application Approved",
                        description:
                            `This school enrolment application has been **approved** by ${interaction.user}.`,
                        fields: [
                            {
                                name:
                                    "Applicant",
                                value:
                                    `<@${ownerId}>`
                            },
                            {
                                name:
                                    "School",
                                value:
                                    application.answers.schoolName
                            }
                        ],
                        footer:
                            "RSA Utility"
                    })
                ],
                components: []
            });

            await sendApplicationDM(
                ownerId,
                interaction.guild,
                createEmbed({
                    title:
                        "School Enrolment Approved",
                    description:
                        `Your school **${application.answers.schoolName}** has been approved for enrolment with the Roblox Schools Association.`,
                    footer:
                        "RSA Utility"
                })
            );

            return;
        }

        /* =========================
           DENY
        ========================= */

        if (
            interaction.customId ===
            "application_deny"
        ) {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        `application_deny_modal:${ownerId}`
                    )
                    .setTitle(
                        "Deny Application"
                    );

            const reason =
                new TextInputBuilder()
                    .setCustomId(
                        "reason"
                    )
                    .setLabel(
                        "Reason for denial"
                    )
                    .setStyle(
                        TextInputStyle.Paragraph
                    )
                    .setRequired(true)
                    .setMaxLength(1000);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        reason
                    )
            );

            return interaction.showModal(
                modal
            );
        }

        /* =========================
           REQUEST CHANGES
        ========================= */

        if (
            interaction.customId ===
            "application_changes"
        ) {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        `application_changes_modal:${ownerId}`
                    )
                    .setTitle(
                        "Request Changes"
                    );

            const reason =
                new TextInputBuilder()
                    .setCustomId(
                        "reason"
                    )
                    .setLabel(
                        "What changes are required?"
                    )
                    .setStyle(
                        TextInputStyle.Paragraph
                    )
                    .setRequired(true)
                    .setMaxLength(1500);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        reason
                    )
            );

            return interaction.showModal(
                modal
            );
        }
    }

    /* =====================================================
       TICKETS
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_create"
    ) {

        return handleTicketCreate(
            interaction
        );
    }

    if (
        interaction.customId ===
        "ticket_claim"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to claim tickets.",
                ephemeral: true
            });
        }

        const ownerId =
            getTicketOwner(
                interaction.channel
            );

        return interaction.update({
            embeds: [
                createEmbed({
                    title:
                        "Support Ticket",
                    description:
                        ownerId
                            ? `Welcome <@${ownerId}>.\n\nPlease explain your enquiry clearly and provide any relevant information.`
                            : "Support ticket.",
                    fields: [
                        {
                            name:
                                "Ticket Owner",
                            value:
                                ownerId
                                    ? `<@${ownerId}>`
                                    : "Unknown"
                        },
                        {
                            name:
                                "Status",
                            value:
                                `Claimed by ${interaction.user}`
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            components: [
                ticketButtons(true)
            ]
        });
    }

    if (
        interaction.customId ===
        "ticket_unclaim"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to unclaim tickets.",
                ephemeral: true
            });
        }

        const ownerId =
            getTicketOwner(
                interaction.channel
            );

        return interaction.update({
            embeds: [
                createEmbed({
                    title:
                        "Support Ticket",
                    description:
                        ownerId
                            ? `Welcome <@${ownerId}>.\n\nPlease explain your enquiry clearly and provide any relevant information.`
                            : "Support ticket.",
                    fields: [
                        {
                            name:
                                "Ticket Owner",
                            value:
                                ownerId
                                    ? `<@${ownerId}>`
                                    : "Unknown"
                        },
                        {
                            name:
                                "Status",
                            value:
                                "Unclaimed"
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            components: [
                ticketButtons(false)
            ]
        });
    }

    if (
        interaction.customId ===
        "ticket_close"
    ) {

        const ownerId =
            getTicketOwner(
                interaction.channel
            );

        if (
            !isTicketStaff(
                interaction
            ) &&
            ownerId !==
                interaction.user.id
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to close this ticket.",
                ephemeral: true
            });
        }

        return closeTicket(
            interaction
        );
    }

    if (
        interaction.customId ===
        "ticket_modpanel"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to use the moderator panel.",
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Ticket Moderator Panel",
                    description:
                        "Use the controls below to manage this ticket.",
                    footer:
                        "RSA Utility"
                })
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_rename"
                            )
                            .setLabel(
                                "Rename"
                            )
                            .setStyle(
                                ButtonStyle.Primary
                            ),

                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_unclaim"
                            )
                            .setLabel(
                                "Unclaim"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            ),

                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_adduser"
                            )
                            .setLabel(
                                "Add User"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            ),

                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_removeuser"
                            )
                            .setLabel(
                                "Remove User"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            )
                    ),

                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_close"
                            )
                            .setLabel(
                                "Close Ticket"
                            )
                            .setStyle(
                                ButtonStyle.Danger
                            )
                    )
            ],
            ephemeral: true
        });
    }

    if (
        interaction.customId ===
        "ticket_rename"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to rename tickets.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_ticket_rename"
                )
                .setTitle(
                    "Rename Ticket"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "ticket_name"
                )
                .setLabel(
                    "New Ticket Name"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(90)
                .setValue(
                    interaction.channel.name
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    input
                )
        );

        return interaction.showModal(
            modal
        );
    }

    if (
        interaction.customId ===
        "ticket_adduser"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_ticket_adduser"
                )
                .setTitle(
                    "Add User"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "user_id"
                )
                .setLabel(
                    "Discord User ID"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(25);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    input
                )
        );

        return interaction.showModal(
            modal
        );
    }

    if (
        interaction.customId ===
        "ticket_removeuser"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_ticket_removeuser"
                )
                .setTitle(
                    "Remove User"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "user_id"
                )
                .setLabel(
                    "Discord User ID"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(25);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    input
                )
        );

        return interaction.showModal(
            modal
        );
    }

    /* =====================================================
       EMBED CREATOR BUTTONS
    ===================================================== */

    if (
        !interaction.customId.startsWith(
            "embed_"
        )
    ) {
        return;
    }

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) {

        return interaction.reply({
            content:
                "Your embed session has expired. Run `/embed` again.",
            ephemeral: true
        });
    }

    if (
        interaction.customId ===
        "embed_title"
    ) {

        return showSingleModal(
            interaction,
            "modal_title",
            "Embed Title",
            "title",
            "Title",
            TextInputStyle.Short,
            session.title
        );
    }

    if (
        interaction.customId ===
        "embed_description"
    ) {

        return showSingleModal(
            interaction,
            "modal_description",
            "Embed Description",
            "description",
            "Description",
            TextInputStyle.Paragraph,
            session.description
        );
    }

    if (
        interaction.customId ===
        "embed_extra"
    ) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_extra"
                )
                .setTitle(
                    "Images and Footer"
                );

        const footer =
            new TextInputBuilder()
                .setCustomId(
                    "footer"
                )
                .setLabel(
                    "Footer"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setValue(
                    session.footer ||
                    ""
                );

        const image =
            new TextInputBuilder()
                .setCustomId(
                    "image"
                )
                .setLabel(
                    "Image URL"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setValue(
                    session.image ||
                    ""
                );

        const thumbnail =
            new TextInputBuilder()
                .setCustomId(
                    "thumbnail"
                )
                .setLabel(
                    "Thumbnail URL"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setValue(
                    session.thumbnail ||
                    ""
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    footer
                ),
            new ActionRowBuilder()
                .addComponents(
                    image
                ),
            new ActionRowBuilder()
                .addComponents(
                    thumbnail
                )
        );

        return interaction.showModal(
            modal
        );
    }

    if (
        interaction.customId ===
        "embed_field"
    ) {

        if (
            session.fields.length >=
            25
        ) {

            return interaction.reply({
                content:
                    "Discord allows a maximum of 25 embed fields.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_field"
                )
                .setTitle(
                    "Add Embed Field"
                );

        const name =
            new TextInputBuilder()
                .setCustomId(
                    "name"
                )
                .setLabel(
                    "Field Name"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(256);

        const value =
            new TextInputBuilder()
                .setCustomId(
                    "value"
                )
                .setLabel(
                    "Field Value"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1024);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    name
                ),
            new ActionRowBuilder()
                .addComponents(
                    value
                )
        );

        return interaction.showModal(
            modal
        );
    }

    if (
        interaction.customId ===
        "embed_preview"
    ) {

        return interaction.reply({
            embeds: [
                buildCreatorEmbed(
                    session
                )
            ],
            ephemeral: true
        });
    }

    if (
        interaction.customId ===
        "embed_send"
    ) {

        await interaction.channel.send({
            embeds: [
                buildCreatorEmbed(
                    session
                )
            ]
        });

        embedSessions.delete(
            interaction.user.id
        );

        return interaction.update({
            content:
                "Embed sent successfully.",
            embeds: [],
            components: []
        });
    }

    if (
        interaction.customId ===
        "embed_cancel"
    ) {

        embedSessions.delete(
            interaction.user.id
        );

        return interaction.update({
            content:
                "Embed creation cancelled.",
            embeds: [],
            components: []
        });
    }
}

/* =========================================================
   TICKET CREATE
========================================================= */

async function handleTicketCreate(
    interaction
) {

    const config =
        configs[
            interaction.guild.id
        ]?.ticket;

    if (!config) {

        return interaction.reply({
            content:
                "The ticket system has not been configured.",
            ephemeral: true
        });
    }

    await interaction.deferReply({
        ephemeral: true
    });

    const existing =
        interaction.guild.channels.cache.find(
            channel =>
                channel.type ===
                    ChannelType.GuildText &&
                channel.topic ===
                    `ticket-owner:${interaction.user.id}`
        );

    if (existing) {

        return interaction.editReply({
            content:
                `You already have an open ticket: ${existing}`
        });
    }

    const category =
        interaction.guild.channels.cache.get(
            config.category
        );

    const supportRole =
        interaction.guild.roles.cache.get(
            config.supportRole
        );

    if (!category) {

        return interaction.editReply({
            content:
                "The configured ticket category no longer exists."
        });
    }

    if (!supportRole) {

        return interaction.editReply({
            content:
                "The configured support role no longer exists."
        });
    }

    const safeName =
        interaction.user.username
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                "-"
            )
            .replace(
                /-+/g,
                "-"
            )
            .replace(
                /^-|-$/g,
                ""
            )
            .slice(
                0,
                20
            ) ||
        "user";

    const channel =
        await interaction.guild.channels.create({
            name:
                `ticket-${safeName}`,
            type:
                ChannelType.GuildText,
            parent:
                category.id,
            topic:
                `ticket-owner:${interaction.user.id}`,
            permissionOverwrites: [

                {
                    id:
                        interaction.guild.roles.everyone.id,
                    deny: [
                        PermissionsBitField.Flags.ViewChannel
                    ]
                },

                {
                    id:
                        interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },

                {
                    id:
                        supportRole.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.ManageMessages
                    ]
                },

                {
                    id:
                        client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.ManageMessages
                    ]
                }
            ]
        });

    const ticketEmbed =
        createEmbed({
            title:
                "Support Ticket",
            description:
                `Welcome ${interaction.user}.\n\nPlease explain your enquiry clearly and provide any relevant information. A member of the support team will assist you shortly.`,
            fields: [
                {
                    name:
                        "Ticket Owner",
                    value:
                        interaction.user.toString()
                },
                {
                    name:
                        "Status",
                    value:
                        "Unclaimed"
                }
            ],
            footer:
                "RSA Utility"
        });

    await channel.send({
        content:
            `${interaction.user} <@&${supportRole.id}>`,
        embeds: [
            ticketEmbed
        ],
        components: [
            ticketButtons(false)
        ]
    });

    await sendTicketLog(
        interaction.guild,
        createEmbed({
            title:
                "Ticket Created",
            description:
                "A new support ticket has been created.",
            fields: [
                {
                    name:
                        "Ticket",
                    value:
                        channel.toString()
                },
                {
                    name:
                        "Owner",
                    value:
                        interaction.user.toString()
                }
            ],
            footer:
                "RSA Utility"
        })
    );

    return interaction.editReply({
        content:
            `Your ticket has been created: ${channel}`
    });
}

function ticketButtons(
    claimed
) {

    return new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId(
                    claimed
                        ? "ticket_unclaim"
                        : "ticket_claim"
                )
                .setLabel(
                    claimed
                        ? "Unclaim"
                        : "Claim"
                )
                .setStyle(
                    ButtonStyle.Primary
                ),

            new ButtonBuilder()
                .setCustomId(
                    "ticket_close"
                )
                .setLabel(
                    "Close"
                )
                .setStyle(
                    ButtonStyle.Danger
                ),

            new ButtonBuilder()
                .setCustomId(
                    "ticket_modpanel"
                )
                .setLabel(
                    "Mod Panel"
                )
                .setStyle(
                    ButtonStyle.Secondary
                )
        );
}

/* =========================================================
   APPLICATION HELPERS
========================================================= */

function getApplicationOwner(
    channel
) {

    if (!channel?.topic) {
        return null;
    }

    const match =
        channel.topic.match(
            /enrol-applicant:(\d+)/
        );

    return match
        ? match[1]
        : null;
}

async function sendApplicationDM(
    userId,
    guild,
    embed,
    components = []
) {

    const user =
        await client.users
            .fetch(userId)
            .catch(() => null);

    if (!user) {
        return;
    }

    await user.send({
        embeds: [
            embed
        ],
        components
    }).catch(() => {});
}

/* =========================================================
   TICKET HELPERS
========================================================= */

function getTicketOwner(
    channel
) {

    if (!channel?.topic) {
        return null;
    }

    const match =
        channel.topic.match(
            /ticket-owner:(\d+)/
        );

    return match
        ? match[1]
        : null;
}

/* =========================================================
   EMBED CREATOR
========================================================= */

function buildCreatorEmbed(
    session
) {

    return createEmbed({
        title:
            session.title ||
            "RSA Announcement",
        description:
            session.description ||
            "Use the controls below to build your embed.",
        footer:
            session.footer ||
            "Roblox Schools Association",
        image:
            session.image ||
            undefined,
        thumbnail:
            session.thumbnail ||
            undefined,
        fields:
            session.fields.length
                ? session.fields
                : undefined
    });
}

async function showEmbedBuilder(
    interaction
) {

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) {
        return;
    }

    const row1 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "embed_title"
                    )
                    .setLabel(
                        "Title"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "embed_description"
                    )
                    .setLabel(
                        "Description"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "embed_extra"
                    )
                    .setLabel(
                        "Images / Footer"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "embed_field"
                    )
                    .setLabel(
                        "Add Field"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "embed_preview"
                    )
                    .setLabel(
                        "Preview"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "embed_send"
                    )
                    .setLabel(
                        "Send"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "embed_cancel"
                    )
                    .setLabel(
                        "Cancel"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    const payload = {
        content:
            "### RSA Utility Embed Creator\nBuild your embed using the controls below.",
        embeds: [
            buildCreatorEmbed(
                session
            )
        ],
        components: [
            row1,
            row2
        ],
        ephemeral: true
    };

    if (
        interaction.replied ||
        interaction.deferred
    ) {

        return interaction.editReply(
            payload
        );
    }

    return interaction.reply(
        payload
    );
}

/* =========================================================
   MODAL HANDLER
========================================================= */

async function handleModal(
    interaction
) {

    /* =====================================================
       ENROLMENT MODALS
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "enrol_questions_1:"
        ) ||
        interaction.customId.startsWith(
            "enrol_questions_2:"
        )
    ) {

        return handleEnrolModal(
            interaction
        );
    }

    /* =====================================================
       ENROL CONFIG
    ===================================================== */

    if (
        interaction.customId ===
            "enrolconfig_category_modal" ||
        interaction.customId ===
            "enrolconfig_staff_modal"
    ) {

        return handleEnrolConfigModal(
            interaction
        );
    }

    /* =====================================================
       DENIAL
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "application_deny_modal:"
        )
    ) {

        if (
            !isEnrolStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to review applications.",
                ephemeral: true
            });
        }

        const ownerId =
            interaction.customId.split(":")[1];

        const reason =
            interaction.fields.getTextInputValue(
                "reason"
            );

        const application =
            applications[
                `${interaction.guild.id}:${ownerId}`
            ];

        if (!application) {

            return interaction.reply({
                content:
                    "Application not found.",
                ephemeral: true
            });
        }

        application.status =
            "denied";

        application.reviewedBy =
            interaction.user.id;

        application.reviewedAt =
            Date.now();

        application.denialReason =
            reason;

        saveJSON(
            APPLICATIONS_FILE,
            applications
        );

        await interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Application Denied",
                    description:
                        `This application has been denied by ${interaction.user}.`,
                    fields: [
                        {
                            name:
                                "Reason",
                            value:
                                reason
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ]
        });

        await sendApplicationDM(
            ownerId,
            interaction.guild,
            createEmbed({
                title:
                    "School Enrolment Denied",
                description:
                    `Unfortunately, your school enrolment application for **${application.answers.schoolName}** has been denied.`,
                fields: [
                    {
                        name:
                            "Reason",
                        value:
                            reason
                    }
                ],
                footer:
                    "RSA Utility"
            })
        );

        return;
    }

    /* =====================================================
       REQUEST CHANGES
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "application_changes_modal:"
        )
    ) {

        if (
            !isEnrolStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to review applications.",
                ephemeral: true
            });
        }

        const ownerId =
            interaction.customId.split(":")[1];

        const reason =
            interaction.fields.getTextInputValue(
                "reason"
            );

        const application =
            applications[
                `${interaction.guild.id}:${ownerId}`
            ];

        if (!application) {

            return interaction.reply({
                content:
                    "Application not found.",
                ephemeral: true
            });
        }

        application.status =
            "changes";

        application.reviewedBy =
            interaction.user.id;

        application.reviewedAt =
            Date.now();

        application.changeRequest =
            reason;

        saveJSON(
            APPLICATIONS_FILE,
            applications
        );

        const resubmitButton =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "enrol_resubmit"
                        )
                        .setLabel(
                            "Resubmit Enrolment"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        )
                );

        await interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Changes Requested",
                    description:
                        `Changes have been requested from <@${ownerId}>.`,
                    fields: [
                        {
                            name:
                                "Requested Changes",
                            value:
                                reason
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ]
        });

        await sendApplicationDM(
            ownerId,
            interaction.guild,
            createEmbed({
                title:
                    "Changes Requested",
                description:
                    `The RSA team has reviewed your school enrolment application for **${application.answers.schoolName}** and requested some changes.`,
                fields: [
                    {
                        name:
                            "Changes Required",
                        value:
                            reason
                    }
                ],
                footer:
                    "RSA Utility"
            }),
            [
                resubmitButton
            ]
        );

        return;
    }

    /* =====================================================
       TICKET RENAME
    ===================================================== */

    if (
        interaction.customId ===
        "modal_ticket_rename"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to rename tickets.",
                ephemeral: true
            });
        }

        let name =
            interaction.fields
                .getTextInputValue(
                    "ticket_name"
                )
                .toLowerCase()
                .replace(
                    /[^a-z0-9-_]/g,
                    "-"
                )
                .replace(
                    /-+/g,
                    "-"
                )
                .replace(
                    /^-|-$/g,
                    ""
                )
                .slice(
                    0,
                    90
                );

        if (!name) {
            name = "ticket";
        }

        await interaction.channel.setName(
            name
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Ticket Renamed",
                    description:
                        `The ticket has been renamed to **${name}**.`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       ADD USER
    ===================================================== */

    if (
        interaction.customId ===
        "modal_ticket_adduser"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const userId =
            interaction.fields
                .getTextInputValue(
                    "user_id"
                )
                .trim();

        const member =
            await interaction.guild.members
                .fetch(userId)
                .catch(() => null);

        if (!member) {

            return interaction.reply({
                content:
                    "I could not find that member in this server.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.edit(
            member.id,
            {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            }
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "User Added",
                    description:
                        `${member} has been added to this ticket.`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       REMOVE USER
    ===================================================== */

    if (
        interaction.customId ===
        "modal_ticket_removeuser"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const userId =
            interaction.fields
                .getTextInputValue(
                    "user_id"
                )
                .trim();

        const member =
            await interaction.guild.members
                .fetch(userId)
                .catch(() => null);

        if (!member) {

            return interaction.reply({
                content:
                    "I could not find that member.",
                ephemeral: true
            });
        }

        const ownerId =
            getTicketOwner(
                interaction.channel
            );

        if (
            ownerId ===
            member.id
        ) {

            return interaction.reply({
                content:
                    "The ticket owner cannot be removed from their own ticket.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.delete(
            member.id
        ).catch(() => {});

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "User Removed",
                    description:
                        `${member} has been removed from this ticket.`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       EMBED MODALS
    ===================================================== */

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) {

        return interaction.reply({
            content:
                "Your embed session has expired. Run `/embed` again.",
            ephemeral: true
        });
    }

    if (
        interaction.customId ===
        "modal_title"
    ) {

        session.title =
            interaction.fields
                .getTextInputValue(
                    "title"
                );

    } else if (
        interaction.customId ===
        "modal_description"
    ) {

        session.description =
            interaction.fields
                .getTextInputValue(
                    "description"
                );

    } else if (
        interaction.customId ===
        "modal_extra"
    ) {

        session.footer =
            interaction.fields
                .getTextInputValue(
                    "footer"
                );

        session.image =
            interaction.fields
                .getTextInputValue(
                    "image"
                );

        session.thumbnail =
            interaction.fields
                .getTextInputValue(
                    "thumbnail"
                );

    } else if (
        interaction.customId ===
        "modal_field"
    ) {

        if (
            session.fields.length >=
            25
        ) {

            return interaction.reply({
                content:
                    "Discord allows a maximum of 25 fields.",
                ephemeral: true
            });
        }

        const name =
            interaction.fields
                .getTextInputValue(
                    "name"
                );

        const value =
            interaction.fields
                .getTextInputValue(
                    "value"
                );

        session.fields.push({
            name,
            value,
            inline: false
        });

    } else {

        return;
    }

    return interaction.reply({
        embeds: [
            createEmbed({
                title:
                    "Embed Updated",
                description:
                    "Your embed has been updated.",
                footer:
                    "RSA Utility"
            })
        ],
        ephemeral: true
    });
}

/* =========================================================
   CLOSE TICKET
========================================================= */

async function closeTicket(
    interaction
) {

    const channel =
        interaction.channel;

    const ownerId =
        getTicketOwner(
            channel
        );

    await interaction.reply({
        embeds: [
            createEmbed({
                title:
                    "Ticket Closing",
                description:
                    "This ticket is being closed and a transcript will be saved.",
                footer:
                    "RSA Utility"
            })
        ]
    });

    const messages = [];

    try {

        let before;

        while (
            messages.length <
            1000
        ) {

            const fetched =
                await channel.messages.fetch({
                    limit: 100,
                    ...(before
                        ? {
                            before
                        }
                        : {})
                });

            if (!fetched.size) {
                break;
            }

            messages.push(
                ...fetched.values()
            );

            before =
                fetched.last().id;

            if (
                fetched.size <
                100
            ) {
                break;
            }
        }

    } catch (error) {

        console.error(
            "Transcript error:",
            error
        );
    }

    messages.sort(
        (a, b) =>
            a.createdTimestamp -
            b.createdTimestamp
    );

    let transcript =
        `${BOT_NAME} Ticket Transcript\n`;

    transcript +=
        `Server: ${interaction.guild.name}\n`;

    transcript +=
        `Channel: #${channel.name}\n`;

    transcript +=
        `Ticket Owner: ${ownerId || "Unknown"}\n`;

    transcript +=
        `Closed By: ${interaction.user.tag}\n`;

    transcript +=
        `Closed At: ${new Date().toISOString()}\n`;

    transcript +=
        `\n========================================\n\n`;

    for (
        const message of messages
    ) {

        const timestamp =
            new Date(
                message.createdTimestamp
            ).toISOString();

        const author =
            message.author?.tag ||
            "Unknown";

        let content =
            message.content ||
            "[No text content]";

        if (
            message.attachments.size
        ) {

            content +=
                ` | Attachments: ${[
                    ...message.attachments.values()
                ]
                    .map(
                        attachment =>
                            attachment.url
                    )
                    .join(", ")}`;
        }

        transcript +=
            `[${timestamp}] ${author}: ${content}\n`;
    }

    const attachment =
        new AttachmentBuilder(
            Buffer.from(
                transcript,
                "utf8"
            ),
            {
                name:
                    `${channel.name}-transcript.txt`
            }
        );

    await sendTicketLog(
        interaction.guild,
        createEmbed({
            title:
                "Ticket Closed",
            description:
                "A ticket has been closed.",
            fields: [
                {
                    name:
                        "Ticket",
                    value:
                        `#${channel.name}`
                },
                {
                    name:
                        "Owner",
                    value:
                        ownerId
                            ? `<@${ownerId}>`
                            : "Unknown"
                },
                {
                    name:
                        "Closed By",
                    value:
                        interaction.user.toString()
                }
            ],
            footer:
                "RSA Utility"
        }),
        attachment
    );

    setTimeout(
        async () => {

            await channel.delete(
                `Ticket closed by ${interaction.user.tag}`
            ).catch(() => {});

        },
        1500
    );
}

/* =========================================================
   SINGLE MODAL
========================================================= */

async function showSingleModal(
    interaction,
    customId,
    modalTitle,
    inputId,
    label,
    style,
    value
) {

    const modal =
        new ModalBuilder()
            .setCustomId(
                customId
            )
            .setTitle(
                modalTitle
            );

    const maxLength =
        style ===
            TextInputStyle.Paragraph
            ? 4000
            : 256;

    const input =
        new TextInputBuilder()
            .setCustomId(
                inputId
            )
            .setLabel(
                label
            )
            .setStyle(
                style
            )
            .setRequired(false)
            .setMaxLength(
                maxLength
            );

    if (value) {

        input.setValue(
            value.slice(
                0,
                maxLength
            )
        );
    }

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(
                input
            )
    );

    return interaction.showModal(
        modal
    );
}

/* =========================================================
   ERROR HANDLING
========================================================= */

client.on(
    "error",
    error => {

        console.error(
            "Discord client error:",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "Unhandled promise rejection:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {

        console.error(
            "Uncaught exception:",
            error
        );
    }
);

/* =========================================================
   LOGIN
========================================================= */

client.login(
    TOKEN
);
