Survey App 問卷統計網站 
---
簡介：
一個基於 Node.js 和 MongoDB 的問卷管理系統，提供使用者註冊、登入、問卷建立與填寫等功能，並支援 JWT 驗證以確保資料安全。

---
技術棧

前端：HTML、CSS、JavaScript (Vanilla JS)

後端：Node.js、Express.js

資料庫：MongoDB

驗證：JWT (JSON Web Token)

其他工具：Postman（API 測試）、Git（版本控制）

---
專案功能

1.使用者管理：

    註冊：使用者可註冊帳號，密碼經過加密後存入資料庫。
    
    登入：支援 JWT 驗證，登入後可獲取專屬的 Token。
    
2.問卷管理：

    問卷建立：使用者可新增問卷，並設定問題類型（單選、多選、文字）。
    
    問卷填寫：其他使用者可填寫問卷，並提交答案。
    
3.安全性：

    使用 JWT 驗證保護 API，確保只有授權的使用者能存取敏感資料。
---
專案當前規劃

    1.使用者驗證流程：從註冊到登入，密碼加密與 JWT 驗證確保資料安全。

    2.模組化設計：前後端分離，路由與功能模組化，易於維護與擴展。
    
    3.資料庫操作：使用 MongoDB 進行 CRUD 操作，並處理唯一性驗證與錯誤處理。
    
    4.API 測試：使用 Postman 測試所有 API，確保穩定性與正確性。
---
未來規劃

    1.功能擴展：新增問卷統計功能，提供圖表化的數據分析。
    
    2.前端框架：將前端升級為 React 或 Vue.js，提升開發效率與使用者體驗。
    
    3.部署：將專案部署到雲端，提供線上測試版本。
---
