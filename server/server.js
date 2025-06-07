const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const cnx = mysql.createConnection({
	host: 'HOST',
	user: 'USER',
	password: 'PASSWORD',
	database: 'YOUR_DATA_BASE'
});


cnx.connect(err => {
	if(err){
		console.error('database connection failed: ', err);
		return;
	}
	console.log('Connected to db server');
});


app.post('/register',(req,res) => {
	const {username,email,password} = req.body;
	const device_id = 1;
	const sql = 'INSERT INTO users(username,email,password,device_id) VALUES(?,?,?,1)';
	cnx.query(sql,[username,email,password],(err,results)=>{
		if(err){
			console.log(err);
			return res.status(500).json({error: 'Error creating user'});
		}
	res.status(201).json({id: results.insertId,username});
	});
	
});


app.post('/login',(req,res) =>{
	const {username,password} = req.body;
	const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
	cnx.query(sql,[username,password], (err, results) => {
		
		if(err || results.length == 0){
			return res.status(400).json({error: 'Invalid username or password'});
		}
		const user = results[0];
		res.json({id: user.id, username: user.username});
		
	});
	
});

//post notification
app.post('/notification', (req,res) => {
		const {message,notification_type} = req.body;
		const sql = 'INSERT INTO notifications(device_id,message,notification_type) VALUES(1,?,?)';
		if(!['mail','full mailbox'].includes(notification_type)){
			return res.status(400).json({error: 'invalide notification_type'});	
		}
		
		cnx.query(sql,[message,notification_type],(err,results) => {
			if(err){
				console.error('error while inserting the notification : ' , err);
				return res.status(400).json({error: 'Failed to save notification'});
			}
			 res.status(201).json({ message: 'Notification saved successfully', notificationId: results.insertId });
		});
});
//getall notification that the status is_read true
app.get('/notifications', (req,res) => {
	const sql = 'SELECT * FROM notifications WHERE is_read = TRUE';
	cnx.query(sql,(err,results) => {
		if(err){
			return res.status(400).json({error: 'error while fetching data'});
		}
		res.json(results);
	});
	
});

//Update : update status of a notification
app.put('/notification/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Check if status is provided
    if (!status) {
        return res.status(400).json({ message: 'Status is required' });
    }

    const sql = 'UPDATE notifications SET is_read = ? WHERE id = ?';
    
    cnx.query(sql, [status, id], (err, results) => {
        if (err) {
            console.error('Error updating notification status:', err);
            return res.status(500).json({ message: 'Error updating notification status' });
        } 
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json({ message: 'Notification status updated' });
    });
});

app.post('/get_statistics', (req, res) => {
    const period = req.body.period;

    try {
        let query;
        
        // Determine the query based on the specified period
        if (period === 'day') {
            query = 'SELECT DATE(date_time) as date, COUNT(*) as count FROM notifications GROUP BY date ORDER BY date ASC';
        } else if (period === 'week') {
            query = 'SELECT WEEK(date_time) as week, COUNT(*) as count FROM notifications GROUP BY week ORDER BY week ASC';
        } else if (period === 'month') {
            query = 'SELECT MONTH(date_time) as month, COUNT(*) as count FROM notifications GROUP BY month ORDER BY month ASC';
        } else {
            return res.status(400).json({ error: 'Invalid period specified. Choose day, week, or month.' });
        }

        // Execute the query
        cnx.query(query, (error, results) => {
            if (error) {
                console.error('Error executing query:', error);
                return res.status(500).json({ error: 'Failed to fetch statistics' });
            }

            res.json({ data: results });
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});


const port = 3000;
app.listen(port,() => {
	console.log(`Server is running on port ${port}`);
});