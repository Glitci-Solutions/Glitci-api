const img =
  "https://res.cloudinary.com/dx5n4ekk2/image/upload/v1768701174/glitci/defaults/glitci%20logo%20-%20red%20-%20200x200.png";

export const forgetPasswordEmailHTML = (name, resetCode) => {
  return `<!DOCTYPE html>
  <html lang="en-US">
    <head>
      <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
      <title>Reset Password Email</title>
      <meta name="description" content="Reset Password Email" />
      <style type="text/css">
        a:hover {
          text-decoration: underline !important;
        }
      </style>
    </head>
  
    <body
      marginheight="0"
      topmargin="0"
      marginwidth="0"
      style="margin: 0px; background-color: #d0d1d6ff"
      leftmargin="0"
    >
      <!--100% body table-->
      <table
        cellspacing="0"
        border="0"
        cellpadding="0"
        width="100%"
        bgcolor="#f2f3f8"
        style="
          @import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700);
          font-family: 'Open Sans', sans-serif;
        "
      >
        <tr>
          <td>
            <table
              style="background-color: #f2f3f8; max-width: 670px; margin: 0 auto"
              width="100%"
              border="0"
              align="center"
              cellpadding="0"
              cellspacing="0"
            >
              <tr>
                <td style="height: 80px">&nbsp;</td>
              </tr>
              <tr>
                <td style="text-align: center">
                  <a href="" title="logo" target="_blank">
                    <img
                      width="80"
                      src=${img}
                      style="background-color: transparent;"
                      title="logo"
                      alt="logo"
                    />
                  </a>
                </td>
              </tr>
              <tr>
                <td style="height: 20px">&nbsp;</td>
              </tr>
              <tr>
                <td>
                  <table
                    width="95%"
                    border="0"
                    align="center"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                      max-width: 670px;
                      background: #fff;
                      border-radius: 3px;
                      text-align: center;
                      -webkit-box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);
                      -moz-box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);
                      box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);
                    "
                  >
                    <tr>
                      <td style="height: 40px">&nbsp;</td>
                    </tr>
                    <tr>
                      <td style="padding: 0 35px">
                        <h1
                          style="
                            color: #1e1e2d;
                            font-weight: 500;
                            margin: 0;
                            font-size: 30px;
                            font-family: 'Rubik', sans-serif;
                          "
                        >
                          You have requested to reset your password
                        </h1>
                        <span
                          style="
                            display: inline-block;
                            vertical-align: middle;
                            margin: 29px 0 26px;
                            border-bottom: 1px solid #cecece;
                            width: 100px;
                          "
                        ></span>
                        <p
                          style="
                            color: #455056;
                            font-size: 17px;
                            line-height: 24px;
                            margin: 0;
                          "
                        >
                          Hello ${name}, \n
                          We received a request to reset the password on your Glitci account.
                        </p>
                        <p
                          
                          style="
                            color:rgb(155, 44, 16)!important;
                            font-weight: 500;
                            font-size: 25px;
                          "
                          >${resetCode}</p
                        >
                        <p
                          style="
                            color: #455056;
                            font-size: 17px;
                            line-height: 24px;
                            margin: 0;
                          "
                        >
                          Enter this code to complete the reset password process. Please note that this code is only valid for 20 min.
                          
                          Thanks for helping us keep your account secure.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="height: 40px">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
  
              <tr>
                <td style="height: 20px">&nbsp;</td>
              </tr>
              <tr>
                <td style="text-align: center">
                  <p
                    style="
                      font-size: 14px;
                      color: rgba(69, 80, 86, 0.7411764705882353);
                      line-height: 18px;
                      margin: 0 0 0;
                    "
                  >
                    &copy; <strong>https://</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="height: 80px">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <!--/100% body table-->
    </body>
  </html>
  `;
};

export const accountCreatedEmailHTML = (name, email, tempPassword) => {
  return `<!DOCTYPE html>
  <html lang="en-US">
    <head>
      <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
      <title>Welcome to Glitci</title>
      <meta name="description" content="Account Created Email" />
      <style type="text/css">
        a:hover {
          text-decoration: underline !important;
        }
      </style>
    </head>
  
    <body
      marginheight="0"
      topmargin="0"
      marginwidth="0"
      style="margin: 0px; background-color: #d0d1d6ff"
      leftmargin="0"
    >
      <!--100% body table-->
      <table
        cellspacing="0"
        border="0"
        cellpadding="0"
        width="100%"
        bgcolor="#f2f3f8"
        style="
          @import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700);
          font-family: 'Open Sans', sans-serif;
        "
      >
        <tr>
          <td>
            <table
              style="background-color: #f2f3f8; max-width: 670px; margin: 0 auto"
              width="100%"
              border="0"
              align="center"
              cellpadding="0"
              cellspacing="0"
            >
              <tr>
                <td style="height: 80px">&nbsp;</td>
              </tr>
              <tr>
                <td style="text-align: center">
                  <a href="" title="logo" target="_blank">
                    <img
                      width="80"
                      src=${img}
                      style="background-color: transparent;"
                      title="logo"
                      alt="logo"
                    />
                  </a>
                </td>
              </tr>
              <tr>
                <td style="height: 20px">&nbsp;</td>
              </tr>
              <tr>
                <td>
                  <table
                    width="95%"
                    border="0"
                    align="center"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                      max-width: 670px;
                      background: #fff;
                      border-radius: 3px;
                      text-align: center;
                      -webkit-box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);
                      -moz-box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);
                      box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);
                    "
                  >
                    <tr>
                      <td style="height: 40px">&nbsp;</td>
                    </tr>
                    <tr>
                      <td style="padding: 0 35px">
                        <h1
                          style="
                            color: #1e1e2d;
                            font-weight: 500;
                            margin: 0;
                            font-size: 30px;
                            font-family: 'Rubik', sans-serif;
                          "
                        >
                          Welcome to Glitci!
                        </h1>
                        <span
                          style="
                            display: inline-block;
                            vertical-align: middle;
                            margin: 29px 0 26px;
                            border-bottom: 1px solid #cecece;
                            width: 100px;
                          "
                        ></span>
                        <p
                          style="
                            color: #455056;
                            font-size: 17px;
                            line-height: 24px;
                            margin: 0;
                            text-align: left;
                          "
                        >
                          Hello ${name},<br/>
                          Your Glitci account has been created. Use the credentials below to log in:
                        </p>
                        <table
                          style="
                            margin: 20px auto;
                            text-align: left;
                            border-collapse: collapse;
                          "
                        >
                          <tr>
                            <td style="padding: 10px; color: #455056; font-size: 15px; font-weight: 600;">Email:</td>
                            <td style="padding: 10px; color: rgb(155, 44, 16); font-size: 15px; font-weight: 500;">${email}</td>
                          </tr>
                          <tr>
                            <td style="padding: 10px; color: #455056; font-size: 15px; font-weight: 600;">Temp Password:</td>
                            <td style="padding: 10px; color: rgb(155, 44, 16); font-size: 15px; font-weight: 500;">${tempPassword}</td>
                          </tr>
                        </table>
                        <p
                          style="
                            color: #455056;
                            font-size: 17px;
                            line-height: 24px;
                            margin: 0;
                            text-align: left;
                          "
                        >
                          For security reasons, you will be required to change your password upon first login.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="height: 40px">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
  
              <tr>
                <td style="height: 20px">&nbsp;</td>
              </tr>
              <tr>
                <td style="text-align: center">
                  <p
                    style="
                      font-size: 14px;
                      color: rgba(69, 80, 86, 0.7411764705882353);
                      line-height: 18px;
                      margin: 0 0 0;
                    "
                  >
                    &copy; <strong>https://</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="height: 80px">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <!--/100% body table-->
  </html>
  `;
};

export const taskInReviewEmailHTML = ({
  recipientName,
  employeeName,
  departmentName,
  taskName,
  projectName,
  startTime,
  endTime,
  submittedAt,
}) => {
  const projectRow = projectName
    ? `<tr>
        <td style="padding: 10px; color: #455056; font-size: 15px; font-weight: 600;">Project:</td>
        <td style="padding: 10px; color: #455056; font-size: 15px;">${projectName}</td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
  <html lang="en-US">
    <head>
      <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
      <title>Task Submitted for Review</title>
      <meta name="description" content="Task In Review Notification" />
      <style type="text/css">
        a:hover {
          text-decoration: underline !important;
        }
      </style>
    </head>
  
    <body
      marginheight="0"
      topmargin="0"
      marginwidth="0"
      style="margin: 0px; background-color: #d0d1d6ff"
      leftmargin="0"
    >
      <!--100% body table-->
      <table
        cellspacing="0"
        border="0"
        cellpadding="0"
        width="100%"
        bgcolor="#f2f3f8"
        style="
          @import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700);
          font-family: 'Open Sans', sans-serif;
        "
      >
        <tr>
          <td>
            <table
              style="background-color: #f2f3f8; max-width: 670px; margin: 0 auto"
              width="100%"
              border="0"
              align="center"
              cellpadding="0"
              cellspacing="0"
            >
              <tr>
                <td style="height: 80px">&nbsp;</td>
              </tr>
              <tr>
                <td style="text-align: center">
                  <a href="" title="logo" target="_blank">
                    <img
                      width="80"
                      src=${img}
                      style="background-color: transparent;"
                      title="logo"
                      alt="logo"
                    />
                  </a>
                </td>
              </tr>
              <tr>
                <td style="height: 20px">&nbsp;</td>
              </tr>
              <tr>
                <td>
                  <table
                    width="95%"
                    border="0"
                    align="center"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                      max-width: 670px;
                      background: #fff;
                      border-radius: 3px;
                      text-align: center;
                      -webkit-box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);
                      -moz-box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);
                      box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);
                    "
                  >
                    <tr>
                      <td style="height: 40px">&nbsp;</td>
                    </tr>
                    <tr>
                      <td style="padding: 0 35px">
                        <h1
                          style="
                            color: #1e1e2d;
                            font-weight: 500;
                            margin: 0;
                            font-size: 30px;
                            font-family: 'Rubik', sans-serif;
                          "
                        >
                          Task Submitted for Review &#x1F50D;
                        </h1>
                        <span
                          style="
                            display: inline-block;
                            vertical-align: middle;
                            margin: 29px 0 26px;
                            border-bottom: 1px solid #cecece;
                            width: 100px;
                          "
                        ></span>
                        <p
                          style="
                            color: #455056;
                            font-size: 17px;
                            line-height: 24px;
                            margin: 0;
                            text-align: left;
                          "
                        >
                          Hello ${recipientName},<br/>
                          A task has been submitted for <strong style="color: rgb(30, 100, 200);">review</strong> by <strong>${employeeName}</strong>.
                        </p>
                        <table
                          style="
                            margin: 20px auto;
                            text-align: left;
                            border-collapse: collapse;
                            width: 100%;
                          "
                        >
                          <tr>
                            <td style="padding: 10px; color: #455056; font-size: 15px; font-weight: 600;">Task:</td>
                            <td style="padding: 10px; color: rgb(155, 44, 16); font-size: 15px; font-weight: 500;">${taskName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 10px; color: #455056; font-size: 15px; font-weight: 600;">Employee:</td>
                            <td style="padding: 10px; color: #455056; font-size: 15px;">${employeeName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 10px; color: #455056; font-size: 15px; font-weight: 600;">Department:</td>
                            <td style="padding: 10px; color: #455056; font-size: 15px;">${departmentName}</td>
                          </tr>
                          ${projectRow}
                          <tr>
                            <td style="padding: 10px; color: #455056; font-size: 15px; font-weight: 600;">Start Time:</td>
                            <td style="padding: 10px; color: #455056; font-size: 15px;">${startTime}</td>
                          </tr>
                          <tr>
                            <td style="padding: 10px; color: #455056; font-size: 15px; font-weight: 600;">End Time:</td>
                            <td style="padding: 10px; color: #455056; font-size: 15px;">${endTime}</td>
                          </tr>
                          <tr>
                            <td style="padding: 10px; color: #455056; font-size: 15px; font-weight: 600;">Submitted At:</td>
                            <td style="padding: 10px; color: rgb(30, 100, 200); font-size: 15px; font-weight: 500;">${submittedAt}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="height: 40px">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
  
              <tr>
                <td style="height: 20px">&nbsp;</td>
              </tr>
              <tr>
                <td style="text-align: center">
                  <p
                    style="
                      font-size: 14px;
                      color: rgba(69, 80, 86, 0.7411764705882353);
                      line-height: 18px;
                      margin: 0 0 0;
                    "
                  >
                    &copy; <strong>https://</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="height: 80px">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <!--/100% body table-->
    </body>
  </html>
  `;
};
