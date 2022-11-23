require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const firebase = require("firebase/app");
const storage = require("./firebase");
const bcrypt = require('bcryptjs');
const rn = require('random-number');
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const options = {
    min:  1000,
    max:  10000,
    integer: true
}

const nodemailer = require("nodemailer");
//Creating a transport for the nodemailer

//var validator = require("email-validator");
// Email validator
const EmailValidator = require('email-deep-validator');

const emailValidator = new EmailValidator();

// Password validator
var passwordValidator = require('password-validator');
const { request } = require('express');
var schema = new passwordValidator();

// Add properties to it
schema
.is().min(8)                                    // Minimum length 8
.is().max(20)                                  // Maximum length 20
.has().uppercase()                              // Must have uppercase letters
.has().lowercase()                              // Must have lowercase letters
.has().digits(2)                                // Must have at least 2 digits
.has().not().spaces()                           // Should not have spaces
.is().not().oneOf(['Passw0rd', 'Password123', '123456']); // Blacklist these values

const app = express();
const port = process.env.PORT || 8080;


app.use(bodyParser.json());
app.use(cors());
app.use((req,res,next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
})
app.use(express.json());

const urlencodedParser = bodyParser.urlencoded({extended: false});


app.post("/register", async (req,res) => {
    const { wellFormed, validDomain, validMailbox } = await emailValidator.verify(req.body.email);
    const passwordValidator = schema.validate(req.body.password);

    if(wellFormed & validDomain) {
        console.log("Valid Email");
    } else {
        res.json({emailError: "Invalid Email!!"});
    }
    if(passwordValidator) {
        console.log("Strong Password!!");
    } else {
        res.json({passwordError: "Password is not strong."})
    }
    if(wellFormed & validDomain & passwordValidator) {
        storage.db.collection("users").doc(req.body.username)
        .get().then(function(doc) {
            if (doc.exists) {
                res.json({usernameError: "This username is already taken. Please use a different one."});
            } else {
                storage.db.collection("users").get().then(function(querySnapshot) {
                    let emailFound;
                    querySnapshot.forEach(function(doc) {
                        // doc.data() is never undefined for query doc snapshots
                        if(doc.data().email === req.body.email) {
                            emailFound = true;
                        }
                    });
                    if(emailFound === true) {
                        res.json({emailError: "This Email is already in use. Please use a different one."});
                    } else {
                        // const transporter = nodemailer.createTransport({
                        //     service: "Yahoo",
                        //     secure: false,
                        //     auth: {
                        //         user: 'bhabani.business2021@yahoo.com',
                        //         pass: 'vpexxrzenhjaqiez'
                        //     }
                        // });

                        // const code = rn(options);

                        // const htmlBody = `
                        //     <p>Please use the code given below within "60 seconds" to successfully register to Sheesha.</p><br/>
                        //     <h3>CODE - <h2>${code}</h2></h3><br/>
                        //     <p>If you've not asked for registration for Sheesha Website, then please ignore this message and DON'T share this code with anybody.</p><br/>
                        //     <p>Thank You!! Have a great Day.</p><br/>
                        //     <b>Team Sheesha</b>
                        // `
            
                        // const mailOptions = {
                        //     from: 'bhabani.business2021@yahoo.com',
                        //     to: req.body.email,
                        //     subject: 'Confirmation Mail for Sheesha-Reflect the good in you.',
                        //     text: 'Hello User, Thank You for joining with Sheesha.',
                        //     html: htmlBody
                        // };

                        // transporter.sendMail(mailOptions, function(error, info){
                        //     if (error) {
                        //         res.status(500).json({error: error});
                        //     } else {
                        //         res.status(200).json({emailSentMsg: 'Email sent!! Please check your mailbox.', code: code});
                        //     }
                        // });

                        const code = rn(options);

                        const htmlBody = `
                             <p>Please use the code given below within "60 seconds" to successfully register to Sheesha.</p><br/>
                             <h3>CODE - <h2>${code}</h2></h3><br/>
                             <p>If you've not asked for registration for Sheesha Website, then please ignore this message and DON'T share this code with anybody.</p><br/>
                             <p>Thank You!! Have a great Day.</p><br/>
                             <b>Team Sheesha</b>
                        `

                        const msg = {
                            to: req.body.email,
                            // from: 'bhabani.business468@gmail.com',
                            from: {
                                name: 'Sheesha-2021',
                                email: 'bhabani.business468@gmail.com', 
                            },
                            subject: 'Confirmation Mail for Sheesha-Reflect the good in you.',
                            text: 'Hello User, Thank You for joining with Sheesha.',
                            html: htmlBody
                        }

                        sgMail.send(msg).then(() => {
                            res.status(200).json({emailSentMsg: 'Email sent!! Please check your mailbox.', code: code});
                        }).catch(error => {
                            res.status(500).json({error: error});
                        })
                    }
                })
                .catch(function(error) {
                    console.log({error: error});
                });
            }
        }).catch(function(error) {
            res.status(500).json({error: error});
        });
    }
})

app.post("/verified", (req,res) => {
    const creationDate = new Date;
   
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    console.log(hashedPassword);
    console.log("here in hashed password");
    storage.db.collection("users").doc(req.body.username).set({
        name: req.body.name,
        username: req.body.username,
        email: req.body.email,
        password:  hashedPassword,
        emailVerified: true,
        date: creationDate.getDate() + "-" + creationDate.getMonth() + 1 + "-" + creationDate.getFullYear(),
        time: creationDate.getHours() + ":" + creationDate.getMinutes() + ":" + creationDate.getSeconds(),
        bioOne: "",
        bioTwo: "",
        bioThree: "",
        bioFour: "",
        bioFive: "",
        posts: 0,
        followers: 0,
        following: 0,
        account: "private",
        profileImage: ""
    })
    .then(function() {
        console.log("User Created");
        storage.db.collection("posts").doc(req.body.username).set({
            files: []
        }).then(function() {
            console.log("posts created");
        })
        .catch(function(error) {
            res.status(500).json({error: error});
        })  
    })
    .catch(function(error) {
        res.status(500).json({error: error});
    });

    storage.db.collection("followers").doc(req.body.username).set({
        followers: []
    }).then(function() {
        console.log("followers created");
        storage.db.collection("following").doc(req.body.username).set({
            following: []
        }).then(function() {
            console.log("following created");
        }).catch(function(error) {
            res.status(500).json({error: error});
        });
    }).catch(function(error) {
        res.status(500).json({error: error});
    });

    storage.db.collection("requests").doc(req.body.username).set({
        requests: []
    }).then(function() {
        console.log("requests created");
        res.status(200).json({msg: "Congratulations!! You've successfully registered for Sheesha. You can now Login."});
    }).catch(function(error) {
        res.status(500).json({error: error});
    })
})

app.post("/signin", (req,res) => {
    storage.db.collection("users").doc(req.body.username).get().then(function(doc) {
        if (doc.exists) {
            if (bcrypt.compareSync(req.body.password, doc.data().password)) {
                res.status(200).json({msg: "You are successfully logged in!!", username: req.body.username, password: req.body.password});
            } else {
                res.status(200).json({msg: "Wrong Password Entered!!"});
            }
        } else {
            // doc.data() will be undefined in this case
            res.status(200).json({msg: "Username does not exist. Please Register first."});
        }
    }).catch(function(error) {
        res.status(500).json({error: error});
    });
})

app.post("/getProfileImg", (req,res) => {
    storage.db.collection("users").doc(req.body.usernameNew).get().then(function(doc) {
        if (doc.exists) {
            res.status(200).json({imgUrl: doc.data().profileImage});
        } else {
            // doc.data() will be undefined in this case
            res.status(200).json({imgUrl: ""});
        }
    }).catch(function(error) {
        res.status(500).json({error: error});
    });
})

app.post("/getUserData", (req,res) => {
    storage.db.collection("users").doc(req.body.usernameNew).get().then(function(doc) {
        if (doc.exists) {
            res.status(200).json({data: doc.data()});
        } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
        }
    }).catch(function(error) {
        res.status(500).json({error: error});
    });
})

app.post("/editnameprofile", (req, res) => {
    storage.db.collection("users").doc(req.body.username).update({
        name: req.body.newName,
        bioOne: req.body.bioOne,
        bioTwo: req.body.bioTwo,
        bioThree: req.body.bioThree,
        bioFour: req.body.bioFour,
        bioFive: req.body.bioFive,
    })
    .then(function() {
        res.status(200).json({msg: "Your profile updated successfully!!"});
    })
    .catch(function(error) {
        // The document probably doesn't exist.
        res.status(500).json({error: error});
    });
})

app.post("/getPosts", (req,res) => {
    storage.db.collection("posts").doc(req.body.username).get().then(function(doc) {
        if (doc.exists) {
            res.status(200).json({data: doc.data().files});
        } else {
            // doc.data() will be undefined in this case
            res.status(200).json({data: []});
        }
    }).catch(function(error) {
        res.status(500).json({error: error});
    });
})

app.post("/getRequests", (req, res) => {
    let requestsArray = [];
    storage.db.collection("requests").doc(req.body.username).get().then(async (doc) => {
        if (doc.exists) {
            if(doc.data().requests.length === 0) {
                res.status(200).json({data: []});
            } else {
                doc.data().requests.map((request) => {
                    storage.db.collection("users").doc(request).get().then((doc) => {
                        if (doc.exists) {
                            requestsArray.push({username: doc.data().username, profImg: doc.data().profileImage});
                        } else {
                            // doc.data() will be undefined in this case
                            console.log("No such document!");
                        }
                    }).catch((error) => {
                        res.status(500).json({error: error});
                    });
                    
                })
                setTimeout(() => {
                    res.status(200).json({data: requestsArray});
                }, 3000);
            }
        } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
        }
    }).catch((error) => {
        res.status(500).json({error: error});
    });
})

app.post("/changePassword", (req, res) => {
    const hashedNewPassword = bcrypt.hashSync(req.body.password, 10);
    const newPasswordValidator = schema.validate(req.body.password);

    if(newPasswordValidator) {
        storage.db.collection("users").doc(req.body.username).update({
            password: hashedNewPassword
        })
        .then(() => {
            res.status(200).json({msg: "Password successfully changed!!"});
        })
        .catch((error) => {
            // The document probably doesn't exist.
            res.status(500).json({error: error});
        });
    } else {
        res.status(200).json({msg: "Password is not strong."})
    }
})

app.listen(port, () => console.log(`server is running on port ${port}`));


/* console.log("posts created");
            storage.db.collection("followers").doc(req.body.username).set({
                followers: []
            }).then(function() {
                console.log("followers created");
                storage.db.collection("following").doc(req.body.username).set({
                    following: []
                }).then(function() {
                    console.log("following created");
                    storage.db.collection("requests").doc(req.body.username).set({
                        requests: []
                    }).then(function() {
                        console.log("requests created");
                        res.status(200).json({msg: "Congratulations!! You've successfully registered for Sheesha. You can now Login."});
                    }).catch(function(error) {
                        res.status(500).json({error: error});
                    })
                }).catch(function(error) {
                    res.status(500).json({error: error});
                })
            }.catch(function(error) {
                res.status(500).json({error: error});
            })
        )
        */