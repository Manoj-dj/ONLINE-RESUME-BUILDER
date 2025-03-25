const mongoose = require('mongoose');

const dbConfig = {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/resume_builder',
    options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
    }
};

const connectDB = async () => {
    try {
        await mongoose.connect(dbConfig.url, dbConfig.options);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

mongoose.connection.on('error', err => {
    console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    process.exit(0);
});

module.exports = {
    connectDB,
    dbConfig
};