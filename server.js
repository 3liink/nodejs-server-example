const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const multer = require("multer")
const app = express()
const port = 3001
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const fs = require("fs")
const path = require("path")
const socketIo = require("socket.io")
var Moment = require("moment-timezone")

async function hashPassword(password) {
  try {
    // Generate a salt to add to the password before hashing
    const saltRounds = 10
    const salt = await bcrypt.genSalt(saltRounds)

    // Hash the password with the salt
    const hashedPassword = await bcrypt.hash(password, salt)

    return hashedPassword
  } catch (error) {
    throw error
  }
}

const secretKey = "3liink-Example-Project-secret"
const corsOptions = {
  // origin: "*",
  // origin: "http://localhost:3000",
  origin: [process.env.ENDPOINT_URL, "http://localhost:3000"],
  credentials: true,
}

app.use(cors(corsOptions))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use("/images", express.static(path.join(__dirname, "uploads")))
const server = require("http").createServer(app)
// Storage settings
// เอา form append ส่ง files ไว้ล่างสุด ก่อนสร้าง body อื่นๆ
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let mainPath = "./uploads"
    let dynamicPath = req.body.folder
    let filePath = mainPath + dynamicPath
    // let filePath = mainPath
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true })
    }
    cb(null, filePath)
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  },
})
const upload = multer({ storage })
const cpUpload = upload.fields([
  { name: "files", maxCount: 20 },
  { name: "thumbnail", maxCount: 20 },
])
const cpUploadSlip = upload.fields([{ name: "image", maxCount: 1 }])

// custom function
function getCurDate() {
  var today = new Date()
  var dd = String(today.getDate()).padStart(2, "0")
  var mm = String(today.getMonth() + 1).padStart(2, "0") //January is 0!
  var yyyy = today.getFullYear()

  today = mm + dd + yyyy
  return today
}
function getCurDateTimeForMySQL() {
  let now = Moment().tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss")
  return now
}
function getCurDateForMySQL() {
  let now = Moment().tz("Asia/Bangkok").format("YYYY-MM-DD")
  return now
}

function getRandom4DigitNumberWithLeadingZeros() {
  const min = 0
  const max = 9999
  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min
  // Format the number to always have 4 digits with leading zeros
  return randomNumber.toString().padStart(4, "0")
}

//   ######### API Route #################################

app.get("/", (req, res) => {
  res.json({ message: "Hello world!", endpoint: process.env.ENDPOINT_URL })
})

app.get("/movies", async (req, res) => {
  try {
    // ################### Start Query ####################
    const movies = await prisma.movie.findMany()
    // ################### End Query ###################
    res.send({
      ok: true,
      movies: movies,
    })
    await prisma.$disconnect()
  } catch (error) {
    res.send({
      ok: false,
      error: error,
      message: "Query error!",
    })
    await prisma.$disconnect()
    process.exit(1)
  }
})
app.get("/movie/:id", async (req, res) => {
  try {
    // ################### Start Query ####################
    const movie = await prisma.movie.findUnique({
      where: { id: parseInt(req.params.id) },
    })
    // ################### End Query ###################
    res.send({
      ok: true,
      movie: movie,
    })
    await prisma.$disconnect()
  } catch (error) {
    console.log(error)
    res.send({
      ok: false,
      error: error,
      message: "Query error!",
    })
    await prisma.$disconnect()
    process.exit(1)
  }
})

app.post("/check-authentication", async (req, res) => {
  try {
    // ################### Start Query ####################
    const checkUser = await prisma.User.findFirst({
      where: {
        email: req.body.email,
      },
    })
    // ################### End Query ###################

    bcrypt.compare(
      req.body.password,
      checkUser.password,
      function (err, result) {
        if (result) {
          delete checkUser.password
          checkUser.serverToken = jwt.sign({ id: checkUser.id }, secretKey)
          res.send({
            ok: true,
            user: checkUser,
          })
          console.log(checkUser)
        } else {
          console.log(err)
        }
      }
    )
    // console.log(await hashPassword(req.body.password))
    await prisma.$disconnect()
  } catch (error) {
    res.send({
      ok: false,
      error: error,
      message: "Query error!",
    })
    await prisma.$disconnect()
    process.exit(1)
  }
})

app.post("/add-movie", cpUploadSlip, async (req, res) => {
  const token = req.body.token
  const title = req.body.title
  const extract = req.body.extract
  const year = req.body.year
  const cast = req.body.cast
  const genres = req.body.genres
  const href = req.body.href
  const thumbnail = req.body.thumbnail
  // const token = req.headers['token']
  jwt.verify(token, secretKey, async (err) => {
    if (err) {
      res.send("Your token is invalid. Please contact the administrator.")
    } else {
      try {
        // ################### Start Query ####################
        const addMovie = await prisma.movie.create({
          data: {
            title,
            extract,
            year,
            cast,
            genres,
            href,
            thumbnail,
          },
        })
        // ################### End Query ###################
        res.send({
          ok: true,
          addMovie,
        })
        await prisma.$disconnect()
      } catch (error) {
        res.send({
          ok: false,
          error: error,
          message: "Query error!",
        })
        await prisma.$disconnect()
        process.exit(1)
      }
    }
  })
})
app.put("/edit-movie/:id", cpUploadSlip, async (req, res) => {
  const token = req.body.token
  const id = parseInt(req.params.id)
  const title = req.body.title
  const extract = req.body.extract
  const year = req.body.year
  const cast = req.body.cast
  const genres = req.body.genres
  const href = req.body.href
  const thumbnail = req.body.thumbnail
  const filename = req.body.filename
  jwt.verify(token, secretKey, async (err) => {
    if (err) {
      res.send("Your token is invalid. Please contact the administrator.")
    } else {
      try {
        // ################### Start Query ####################
        let editMovie = null
        if (filename === "null") {
          editMovie = await prisma.movie.update({
            where: { id },
            data: {
              title,
              extract,
              year,
              cast,
              genres,
              href,
            },
          })
        } else {
          editMovie = await prisma.movie.update({
            where: { id },
            data: {
              title,
              extract,
              year,
              cast,
              genres,
              href,
              thumbnail,
            },
          })
        }
        // ################### End Query ###################
        res.send({
          ok: true,
          editMovie,
        })
        await prisma.$disconnect()
      } catch (error) {
        console.log(error)
        res.send({
          ok: false,
          error: error,
          message: "Query error!",
        })
        await prisma.$disconnect()
        process.exit(1)
      }
    }
  })
})
app.delete("/delete-movie/:id", async (req, res) => {
  const token = req.headers['token']
  const id = parseInt(req.params.id)
  jwt.verify(token, secretKey, async (err) => {
    if (err) {
      res.send("Your token is invalid. Please contact the administrator.")
    } else {
      try {
        // ################### Start Query ####################
        await prisma.movie.delete({
          where: {id}
        })
        // ################### End Query ###################
        res.send({
          ok: true
        })
        await prisma.$disconnect()
      } catch (error) {
        res.send({
          ok: false,
          error: error,
          message: "Query error!",
        })
        await prisma.$disconnect()
        process.exit(1)
      }
    }
  })
})

//   ######### API Route #################################

// Templates
app.patch("/template", async (req, res) => {
  const token = req.body.token
  // const token = req.headers['token']
  jwt.verify(token, secretKey, async (err) => {
    if (err) {
      res.send("Your token is invalid. Please contact the administrator.")
    } else {
      try {
        // ################### Start Query ####################

        // ################### End Query ###################
        res.send({
          ok: true,
          body: req.body,
        })
        await prisma.$disconnect()
      } catch (error) {
        res.send({
          ok: false,
          error: error,
          message: "Query error!",
        })
        await prisma.$disconnect()
        process.exit(1)
      }
    }
  })
})

//   ######### Listen and Template #################################

server.listen(port, () => {
  console.log("################### - restart - ###################")
})

// const io = socketIo(server)
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.ENDPOINT_URL,
    methods: ["GET", "POST"],
  },
})

// io.on("connection", (socket) => {
//   setInterval(() => {
//     console.log("A user connected")
//   }, 5000);

//   // Handle disconnection
//   socket.on("disconnect", () => {
//     console.log("User disconnected")
//   })
// })
