import { navbar } from "vuepress-theme-hope";

export default navbar([
  "/",
  {
    text: "数据库",
    icon: "fa-solid fa-database",
    prefix: "database/",
    children: [
      {
        text: "MySQL",
        icon: "fa-solid fa-database",
        prefix: "mysql/",
        children: [
          {text: "MySQL数据库安装", icon: "fa-solid fa-database", link: "MySQL数据库安装"},
          {text: "MySQL主从集群搭建", icon: "fa-solid fa-database", link: "MySQL主从集群搭建"},
        ],
      },
      {
        text: "Redis",
        icon: "fa-solid fa-server",
        prefix: "redis/",
        children: [
          {text: "Redis的单机安装步骤", icon: "fa-solid fa-server", link: "Redis的单机安装步骤"},
          {text: "Redis的哨兵架构配置", icon: "fa-solid fa-server", link: "Redis的哨兵架构配置"},
          {text: "Redis的主从架构", icon: "fa-solid fa-server", link: "Redis的主从架构"},
          {text: "Redis的集群搭建", icon: "fa-solid fa-server", link: "Redis的集群搭建"},
        ],
      },
    ],
  },
  {
    text: "Git",
    icon: "fa-solid fa-code-branch",
    prefix: "/git/",
    children: [
      {text: "Git常用命令", icon: "fa-solid fa-code-branch", link: "Git常用命令"},
      {text: "Git提交代码规范", icon: "fa-solid fa-code-branch", link: "Git提交代码规范"},
      {text: "修改历史版本代码方案", icon: "fa-solid fa-code-branch", link: "修改历史版本代码方案"},
    ],
  },
  /*{
    text: "V2 文档",
    icon: "book",
    link: "https://theme-hope.vuejs.press/zh/",
  },*/
]);
