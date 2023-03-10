const express=require('express');

const newticket=require('../models/ticket-new')
const mongoose=require('mongoose')
const {bookedmail,cancelmail}=require('../emailservice/email')
const auth=require('../middleware/auth')
const router=express.Router();
const bcrypt=require('bcryptjs');


//to book a ticket
router.post('/ticketsave',async(req,res)=>
{
    try{
        const count=await newticket.estimatedDocumentCount();
        console.log('no of tickets',count)
        if(count<20)
        {
       let ticket=new newticket(req.body);
       tickets= await ticket.save();
       const token=await tickets.generateAuthTokens()
       bookedmail(tickets.email,tickets.name,tickets.seat_number)

           res.status(200).send({tickets})
        }
    }
    catch(e)
    {
        console.log(e)
        res.status(404).json({message:e})
        return;
    }

     
})

router.post('/login',async(req,res)=>
{
    try {
        console.log('im in try block')
        const e1=req.body.email
        const p1=req.body.password
        const ticket= await newticket.findOne({email:e1})
        console.log('im after try finding ticket')
        if(!ticket)
        {
            throw new Error('your ticket is not found with the credentials your provided')
        }
        const ismatch=await bcrypt.compare(p1,ticket.password)
        if(!ismatch)
        {
            throw new Error('your password is not matching')
        }
        const token=await newticket.generateAuthTokens()
        res.status(200).send({ticket,token})
    }
    catch(err)
    {
        res.status(404).send(err)
    } 
})





//to display all the tickets
router.get('/viewall',auth,async(req,res)=>
{
    try {
      await  newticket.find({}).sort({name:-1,is_booked:-1}).exec((err,response)=>
      {
          if(err)
          {
              res.status(500).json({message:'unable to fetch records'})
          }
          else
          {
              res.status(200).json(response)
          }
      })
        
    } catch (error) {
        console.log(error)
    }
})




// to display all the boooked tickets
router.get('/viewClosed',auth,async(req,res)=>
{
  try{
       let closed= await newticket.find({is_booked:true})
       res.status(200).json(closed);
  }catch(err)
  {
      res.status(404).json({message:err})
  }
})

//to display all the available tickets
router.get('/viewOpen',async(req,res)=>
{
    let ticket;
    try{
        ticket=await newticket.find({is_booked:{ $ne:true}})
        if(ticket.length<1)
        return res.status(404).json({message:'no ticket found'});
        res.sendStatus(200).json(ticket)
    }
    catch(e)
    {
        res.send(e)
        console.log(e)
    }
})


//to check status if a ticket is booked or not
router.get('/ticket/:ticket_id', (req, res) => {
    const { ticket_id } = req.params
    newticket.findById(ticket_id, (err, ticket) =>{
        if (err)
         res.status(404).json({ message: err })

        if (ticket) 
        res.status(200).json({ status: ticket.is_booked })
    })
})


module.exports=router

//to view a single ticket details

router.get('/:t_id',async(req,res)=>
{  
    var ticket;
    try { 
        ticket= await newticket.findById(req.params.t_id)  
        res.status(200).json(ticket)
    } catch (error) {
        console.log(error)

        res.send(error);   
    }    
})

//to cancel a ticket, with the help of id
router.delete('/cancel/:id',async(req,res)=>
{
    let countD=await newticket.estimatedDocumentCount();
    let ticket;
console.log(countD)
    
try
{
    if(countD>=1)
    {
        console.log(countD +'and' + req.params.id)
      ticket=await  newticket.findByIdAndRemove(req.params.id)
      cancelmail(ticket.email,ticket.name)

      
          res.status(200).json({message:'your tikcet is cancelled successfully'});

      
    }
}
    catch(err)
    {
    res.status(404).send(err)
     }

    }
)

// to update the details of a ticket
router.patch('/update/:t_id',async(req,res)=>
{   

    let ticket;
    let anotherticket;
    try{
        ticket=await newticket.findById(req.params.t_id)
        if(!ticket)
        {
            res.status(404).send('ticket with id provided is not found')
        }
      anotherticket=  await newticket.findOneAndUpdate(req.params.id,
            {
                name:req.body.name,
                phoneno:req.body.phoneno,
                email:req.body.email,
                seat_number:req.body.seat_number
            });
            res.status(200).json(anotherticket)
    }
    catch
    {
        res.status(400).send('invalid')
    }
})


// to reset the details of the ticket

router.put('/admin/reset',async(req,res)=>
{ 
    let ticket;
    try{
        const ticket=await newticket.updateMany({},{
            $set:{is_booked:false},
            $unset:
            {
            name:'',
            email:'',
            phoneno:'',
            seat_number:'',
            date:'', 
            },
            
        },{
            multi:true
        })

        const {nmodified}=ticket
        if(!ticket)
        {
            return res.status(404).send('the ticket with tsfsfsfs');
        }
        res.json({modifedCount:nmodified})

    }
    catch(err)
    {
   res.status(400).send(err)
   console.log(err)
    }
})


router.get('/mybus/viewfromdetails',async(req,res)=>
{

    const from=req.body.from
    const to=req.body.to
    //const date=req.body.startdate
   try
   {
 const fromtickets=  await newticket.find({from:from,to:to})
     res.status(200).json({message:fromtickets.name})
   }
   catch(err)
   {
         console.log(err)
         res.status(404).json({message:err})
   } 
})
