import express from 'express'
import mysql from 'mysql2'
import cors from 'cors'

const app = express()

app.use(express.json())

app.get('/', (req,res) =>{
    res.send('tudo certo')
})
console.log("deu certo aqui")
