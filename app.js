
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.photos.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
];

// list of mimeType in Google drive 
const mime_types = {
  "xls":'application/vnd.ms-excel',
  "xlsx":'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  "xml":'text/xml',
  "ods":'application/vnd.oasis.opendocument.spreadsheet',
  "csv":'text/plain',
  "tmpl":'text/plain',
  "pdf": 'application/pdf',
  "php":'application/x-httpd-php',
  "jpg":'image/jpeg',
  "png":'image/png',
  "gif":'image/gif',
  "bmp":'image/bmp',
  "txt":'text/plain',
  "doc":'application/msword',
  "js":'text/js',
  "swf":'application/x-shockwave-flash',
  "mp3":'audio/mpeg',
  "zip":'application/zip',
  "rar":'application/rar',
  "tar":'application/tar',
  "arj":'application/arj',
  "cab":'application/cab',
  "html":'text/html',
  "htm":'text/html',
  "default":'application/octet-stream',
  "folder":'application/vnd.google-apps.folder'
};

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
let content = fs.readFileSync('credentials.json');
authorize(JSON.parse(content));

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 */
function authorize(credentials) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);
  let token = fs.readFileSync(TOKEN_PATH);
  console.log(token);
  if (token != "") {
      oAuth2Client.setCredentials(JSON.parse(token));
      selectController(oAuth2Client);
  } else {
      getAccessToken(oAuth2Client)
  }
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 */
function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      console.log("Authorize successfully! \n");
      selectController(oAuth2Client);      
    });
  });
}

/**
 * Select controller
 * 1: Save list of file from Google Drive
 * 2: Upload file to Google Drive
 * 3: Download file from Google
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 */
function selectController(oAuth2Client) {
  console.log("1: Get and Save file list in file,")
  console.log("2: Upload file from your computer,")
  console.log("3: Download file from Google Drive");
  const r2 = readline.Interface({
    input: process.stdin,
    output: process.stdout,
  });
  r2.question("Please select control item: ", (code) => {
    r2.close();
    switch (code) {
      case '1':
        listFiles(oAuth2Client);
        break;
      case '2':
        uploadFile(oAuth2Client);
        break;
      case '3':
        downloadFile(oAuth2Client);
        break;
      default:
        console.log("You selected wrong number. Please select control item: ");
        r2.resume();
        break;
    }
  }); 
}

/**
 * If uploading file is not exist, upload file from 'files' folder to Google Drive
 * else update file in Google Drive
 * @param {google.auth.OAuth2} auth The OAuth2 client to get token for.
 */
function uploadFile(auth) {  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter filename: ', (filename) => {
    rl.close();
    if (filename != "") {
      var exts = filename.split('.');
      var mimeType = mime_types[exts[exts.length - 1]] != undefined ? mime_types[exts[exts.length - 1]] : "application/vnd.google-apps.file";
      console.log("mimeType ==> " + mimeType);
      if (fs.existsSync("./files/" + filename)) {
        const drive = google.drive({version: 'v3', auth});
        drive.files.list({
          q: "name = '" + filename + "'",
          fields: 'nextPageToken, files(id, name)'
        }, function(err, res) {
          if (err) {
            return console.log("error => " + err);
          } else {
            /// if file is existed, first delete file
            if (res.data.files.length != 0) {
              console.log("deleting id ===> " + res.data.files[0].id);
              drive.files.delete({
                'fileId' : res.data.files[0].id
              });
            }
            /// create file
            var fileMetadata = {
              'name': filename
            };
            var media = {
              mimeType: mimeType,
              body: fs.createReadStream('./files/' + filename)
            };
            drive.files.create({
              resource: fileMetadata,
              media: media,
              fields: 'id'
            }, function (err, file) {
              if (err) {
                // Handle error
                console.error("error ==> " + err);
              } else {
                console.log('File Id: ', file.id);
              }
            });
          }
        })
      }
    }
  });
}

/**
 * Download file from Google Drive if file is exist
 * @param {google.auth.OAuth2} auth The OAuth2 client to get token for.
 */
function downloadFile(auth) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter filename: ', (filename) => {
    rl.close();
    if (filename != "") {
      console.log(filename);
      const drive = google.drive({version: 'v3', auth});
      drive.files.list({
        q: "name = '" + filename + "'",
        fields: 'nextPageToken, files(id, name)'
      }, function(err, res) {
        if (err) {
          return console.log("error => " + err);
        } else {
          if (res.data.files.length == 0) 
            return console.log("We cannot find file you want. try it.")
          let file = res.data.files[0];
          if (file == null) return console.log("We cannot find file you want.");
          console.log("file id => " + file.id);
          // var fileId = '1A6ARg9Q5m7BnFNjYKgqkQSd5gxVaWH_l8y9tjk1rXv4';
          var dest = fs.createWriteStream('./tmp/' + file.name);
          var filePath = './tmp' + file.name;
          /// download file from file id
          drive.files.get({
            fileId: file.id,
            alt: 'media'
          }, {
            responseType: 'stream'
          }).then(res => {
            return new Promise((resolve, reject) => {
              let progress = 0;
              console.log(res.data);
              res.data
                .on('end', () => {
                  console.log('Done downloading file');
                  resolve(filePath);
                })
                .on('error', err => {
                  console.log('Error downloading file');
                  reject(err);
                })
                .on('data', d => {
                  progress += d.length;
                  if (process.stdout.isTTY) {
                    process.stdout.clearLine();
                    process.stdout.cursorTo(0);
                    process.stdout.write(`Downloaded ${progress} bytes`)
                  }
                })
                .pipe(dest);
            })
          })
        }
      })
    }
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listFiles(auth) {
  const drive = google.drive({version: 'v3', auth});
  drive.files.list({
    pageSize: 1000,
    fields: 'nextPageToken, files(id, name, mimeType, parents)',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const files = res.data.files;
    if (files.length) {
      getStructureAndSave(files);
    } else {
      console.log('No files found.');
    }
  });
}

/**
 * get file structure and store it to .txt
 * @param files list of files from google drive apis.
 */
function getStructureAndSave(files) {
  let structure = getStructure(files);
  fs.writeFile("filelists.text", structure, (err) => {
    if (err) return console.error(err);
    console.log("success to save file");
  });
}

/**
 * get file structure from data of files
 * return string of file structure
 * @param files list of files from google drive apis.
 */
function getStructure(files) {
  let strFiles = "";
  let folders = [], onlyfiles = [];
  files.map((file) => {
    if (file.mimeType === "application/vnd.google-apps.folder")
      folders.push(file)
    else 
      onlyfiles.push(file)
  })
  folders.map((folder) => {
    let temp = [];
    strFiles += `${folder.name} (${folder.id}) \n`;
    onlyfiles.map((file) => {
      if (file.parents == folder.id ) {
        console.log("found file in folder");
        strFiles += `\t\t${file.name} (${file.id}) \n`;
      } else {
        temp.push(file);
      }
    });
    onlyfiles = temp;
  });

  if (onlyfiles.length > 0) {
    strFiles += 'no parent folder \n';
    onlyfiles.map((file) => {
      strFiles += `\t\t${file.name} (${file.id}) \n`;
    });
  }

  return strFiles;
}

