// index.js

// 1. 使用 ES Module 导入依赖
import QRCode from "qrcode";
import { UAParser } from "ua-parser-js";
// 2. 直接引入配置文件，不再依赖 HTML 里的 EJS 注入，这样更安全、Vite 支持更好
import DATA from "./config.json"; 

// 初始化 UA 解析器
const parser = new UAParser();
const ua = parser.getResult();
console.log(ua);

// 3. 浏览器端图片加载辅助函数 (替代原本 node-canvas 的 loadImage)
function loadBrowserImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // 允许跨域加载图片（如果你的 icon 在 CDN 上）
    img.crossOrigin = "Anonymous"; 
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

async function showqrcode(url) {
  const container = document.getElementById("showqrcode");
  if(container) container.style.display = "flex";

  // 4. 【核心修改】使用浏览器原生 Canvas，不需要 require('canvas')
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 320;

  // 生成二维码
  // qrcode 库在浏览器端支持 Promise，直接 await 即可，更优雅
  try {
    await QRCode.toCanvas(canvas, url, {
      width: 320,
      height: 320,
      margin: 1, // 留一点白边更美观
      errorCorrectionLevel: 'H' // 高容错率，方便中间贴图
    });
    console.log("success!");
  } catch (error) {
    console.error(error);
  }

  // 绘制中间的 Logo
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false; // 保持像素风格，看你喜好

  // 5. 使用新的图片加载函数
  try {
    // 确保 DATA.qrlogo 存在
    if (DATA.qrlogo) {
       const image = await loadBrowserImage(DATA.qrlogo);
       // 居中绘制: (320 - 44) / 2 = 138
       ctx.drawImage(image, 138, 138, 44, 44);
    }
  } catch (e) {
    console.warn("Logo加载失败，仅显示二维码", e);
  }

  return canvas.toDataURL("image/png");
}

function closeqrcode() {
  const currentQr = document.getElementById("currentqrcode");
  if(currentQr) currentQr.innerHTML = "";
  
  const showQr = document.getElementById("showqrcode");
  if (showQr && showQr.style.display == "flex")
    showQr.style.display = "none"; // CSS 中隐藏通常用 none 而不是空字符串
}

// 绑定关闭事件
const closeBtn = document.getElementById("qrcodeclose");
if(closeBtn) closeBtn.onclick = closeqrcode;

async function openDialog(obj) {
  let dataURL = await showqrcode(obj.url);
  document.getElementById("currentqrcode").src = dataURL;
  
  // 更新标题
  const titleInfo = document.getElementById("titleinfo");
  titleInfo.innerHTML = obj.othertitle;

  let saveqrbtn = document.getElementById("saveqrbtn");
  let closeBtn = document.getElementById("qrcodeclose");
  let openInBrowser = document.getElementById("openinbrower");

  // 重置显示状态
  if(saveqrbtn) saveqrbtn.style.display = "none";
  if(closeBtn) closeBtn.style.display = "block";
  if(openInBrowser) openInBrowser.style.display = "none";

  // 逻辑判断
  if (ua.browser.name == "QQ") {
    // QQ 逻辑
    titleInfo.innerHTML = obj.othertitle;
  } else if (ua.browser.name == "WeChat") {
    // 微信 逻辑
    titleInfo.innerHTML = DATA.wechatpay.wechattitle;
    if(closeBtn) closeBtn.style.display = "none";
    if(openInBrowser) openInBrowser.style.display = "block";
  } else if (
    ua.os.name == "iOS" ||
    ["MIUI Browser", "UCBrowser", "Quark", "baidu"].indexOf(ua.browser.name) != -1
  ) {
    // 特殊浏览器 逻辑
    titleInfo.innerHTML = obj.othertitle;
  } else {
    // 正常浏览器逻辑
    titleInfo.innerHTML = obj.title;
    if(saveqrbtn) {
      saveqrbtn.style.display = "inline-block";
      saveqrbtn.innerHTML = obj.savetext;
      saveqrbtn.href = dataURL;
      saveqrbtn.download = "qrcode.png";
    }
  }
}

let toappbtn = document.getElementById("toappbtn");

// 绑定支付按钮事件
if (DATA.alipay) {
  const btn = document.getElementById("alipaybtn");
  if(btn) btn.onclick = function() {
    if(toappbtn) toappbtn.style.display = "none";
    let open_url = DATA.alipay.open_url;
    // 尝试直接唤起
    if (open_url) window.location.href = open_url; 
    openDialog(DATA.alipay);
  };
}

if (DATA.wechatpay) {
  const btn = document.getElementById("wechatpaybtn");
  if(btn) btn.onclick = function() {
    if (ua.os.name == "iOS" && ua.browser.name != "WeChat") {
      if(toappbtn) {
        toappbtn.style.display = "";
        toappbtn.href = "weixin://scanqrcode";
        toappbtn.innerHTML = DATA.wechatpay.toapptext;
      }
    }
    openDialog(DATA.wechatpay);
  };
}

if (DATA.tenpay) {
  const btn = document.getElementById("tenpaybtn");
  if(btn) btn.onclick = function() {
    if (ua.os.name == "iOS" || ua.os.name == "Android") {
      if(toappbtn) {
        toappbtn.style.display = "";
        toappbtn.href = "mqq://qrcode/scan_qrcode?version=1&src_type=app";
        toappbtn.innerHTML = DATA.tenpay.toapptext;
      }
    }
    openDialog(DATA.tenpay);
  };
}

// 页面加载完成逻辑
// Vite 是模块化加载，不需要 window.onload，代码执行时 DOM 可能还没好
// 建议把 script 放在 body 底部，或者用 DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // 模拟点击关闭，初始化状态
    closeqrcode();

    // 支付宝自动跳转逻辑
    let reg = new RegExp("(^|&)open=([^&]*)(&|$)", "i");
    let r = window.location.search.substr(1).match(reg);
    if (r != null && r[2] == "true" && DATA.alipay) {
      console.log("instant open set to true");
      let open_url = DATA.alipay.open_url;
      if (open_url) window.location.href = open_url;
    }

    // QQ 拦截逻辑
    if (ua.browser.name == "QQ") {
      document.getElementById("tip-img").src = "https://i.loli.net/2019/06/25/5d11d9c19065848452.png";
      document.getElementById("tip").style.display = "block";
    }

    // 微信自动点击逻辑
    if (DATA.wechatpay && ua.browser.name == "WeChat") {
      const wxBtn = document.getElementById("wechatpaybtn");
      if(wxBtn) wxBtn.click();
    }
});