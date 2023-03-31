# carbonFoots
Carbon Footprint Counter, to calculate your daily carbon emission.
# Customize carbonFoots according to your will!
Below are the steps you are required to follow in order to run carbonFoots on your local system:
1) Fork the file or download the zip file in the 'code' section and then extract it to install it in your local system.
2) Move to your bash terminal, and go to the carbonFoots folder 

               eg:  > cd Desktop/carbonFoots-main (I'm assuming the case you downloaded the file and stored on the Desktop folder)
3) Now time to install all the required dependencies by running command as follows:

                  > npm i 
                  This will install all the required dependencies used like Node, Express, Axios etc.
4) Now time to move to your code editor and to make a '.env' file in that folder. 
5) Now edit that file with two entries as given below: 

                 > PORT = 3002 //your server will run on this port
                 > CLIMATEIQ_API_KEY  = 'YOUR CLIMATEIQ API KEY'
                  
                  You may get your own API key to fill here by signing to the CLIMATEIQ API or just move to the this page as give below:
                  https://app.climatiq.io/projects/359541193493709401/admin/keys
# BOOM! and you are all set to use and customize carbonFoots.
