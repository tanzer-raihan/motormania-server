const express = require('express');
const cors = require('cors');
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const ObjectId = require('mongodb').ObjectId
const app = express();
const port = 5000;
app.use(cors());
app.use(express.json());


const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

//connecting mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ahltbit.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//verify users
async function verifyIdToken(req, res, next) {

    if (req.headers.authorization.startsWith('bearer')) {

        try {
            const tokenId = req.headers.authorization.split(' ')[1]
            const decodedUser = await admin.auth().verifyIdToken(tokenId);
            req.decodedUserEmail = decodedUser?.email;
        }
        catch {

        }
    }
    next();


}

//accessing mongodb
async function run() {
    try {
        const database = client.db("motorMania");
        const shopProducts = database.collection("shopProducts");
        const shopAccessories = database.collection("accessories");
        const usersCollection = database.collection("users");
        const cartCollection = database.collection('cart');
        const ordersCollection = database.collection('orders');
        const hotDealsCollection = database.collection('hotDeals');
        const reviewsCollection = database.collection('reviews');

        //home section
        app.get('/hotdeals', async (req, res) => {
            const cursor = hotDealsCollection.find({})
            const result = await cursor.toArray();
            res.json(result);
        })
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const result = await cursor.toArray();
            res.json(result);

        })
        app.post('/reviews', async (req, res) => {
            const reviewInfo = req.body?.review;
            console.log(reviewInfo)
            const result = await reviewsCollection.insertOne(reviewInfo);
            res.json(result)
            console.log(result);
        })

        //shop section

        //getting all products of the shop
        app.get('/shop/products', async (req, res) => {
            const cursor = shopProducts.find({})
            const result = await cursor.toArray();
            res.send(result)
        })

        //getting all accessories of the shop
        app.get('/shop/accessories', async (req, res) => {
            const cursor = shopAccessories.find({});
            const result = await cursor.toArray();
            res.send(result);
        })

        //deleting specific product of the shop
        app.delete('/shop/products', async (req, res) => {
            const deletedProductId = req.body.deletedProductId;
            const query = { _id: ObjectId(deletedProductId) }
            const result = await shopProducts.deleteOne(query);
            res.json(result);
        })
        //deleting specific accessory item of the shop
        app.delete('/shop/accessories', async (req, res) => {
            const deletedProductId = req.body.deletedProductId;
            const query = { _id: ObjectId(deletedProductId) }
            const result = await shopAccessories.deleteOne(query)
            res.json(result);

        })


        //managing all users
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
        })
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user?.email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
        })
        app.put('/users/makeadmin', verifyIdToken, async (req, res) => {
            const newAdminEmail = req.body.adminMail;
            const decodedUserEmail = req.decodedUserEmail;
            const query = { email: decodedUserEmail };
            const requester = await usersCollection.findOne(query);
            if (requester.role === "admin") {
                const filter = { email: newAdminEmail }
                const updateDoc = {
                    $set: {
                        role: 'admin'
                    }
                };
                const result = await usersCollection.updateOne(filter, updateDoc)
                res.json(result)
            }
            else{
                
            }




        })
        app.get('/users/:email', async (req, res) => {
            const userEmail = req.params.email;
            const query = { email: userEmail };
            const result = await usersCollection.findOne(query);
            res.json(result);

        })
        //managing cart section 
        app.put('/cart/:email', async (req, res) => {
            const addedProduct = req.body;
            const filter = { model: addedProduct?.model };
            const options = { upsert: true };
            const updateDoc = {
                $set: addedProduct
            };
            const result = await cartCollection.updateOne(filter, updateDoc, options);
            res.json(result)
        })
        app.get('/cart/:email', async (req, res) => {
            const userEmail = req.params.email;
            const query = { email: userEmail };
            const cursor = cartCollection.find(query);
            const result = await cursor.toArray();
            res.json(result);

        })
        app.delete('/cart/:email', async (req, res) => {
            const productId = req.body.productId;
            const query = { _id: ObjectId(productId) }
            const result = await cartCollection.deleteOne(query);
            res.json(result)


        })

        //managing orders
        //getting all orders
        app.get('/orders', async (req, res) => {
            const cursor = ordersCollection.find({})
            const result = await cursor.toArray();
            res.json(result)
        })
        //handle order status change
        app.put('/orders/:email', async (req, res) => {
            const productId = req.body?.productId;
            const filter = { _id: ObjectId(productId) }
            const updateDoc = {
                $set: {
                    status: 'Shipped'
                }
            };
            const result = await ordersCollection.updateOne(filter, updateDoc)
            res.json(result);
        })



        //posting orders from specific user
        app.post('/orders/:email', async (req, res) => {
            const orderInfo = req.body;
            const result = await ordersCollection.insertOne(orderInfo);
            res.json(result);


        })
        //getting orders of a specific user
        app.get('/orders/:email', async (req, res) => {
            const userEmal = req.params?.email;
            const query = { email: userEmal }
            const cursor = ordersCollection.find(query)
            const result = await cursor.toArray()
            res.json(result);
        })

        //handle order cancellation from user
        app.delete('/orders/:email', async (req, res) => {
            const cancelId = req.body.cancelId;
            const query = { _id: ObjectId(cancelId) }
            const result = await ordersCollection.deleteOne(query);
            res.json(result);
        })


    } finally {
        // await client.close();
    }
}
run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('Getting started with MotorMania Server');
})
app.listen(port, () => {
    console.log('listening to port', port);
})
