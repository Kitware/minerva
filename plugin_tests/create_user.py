from girder.utility.model_importer import ModelImporter

def createUser():
    modelImporter = ModelImporter()
    userModel = modelImporter.model('user').createUser(
        login='admin',
        password='adminpassword!',
        email='minerva@email.com',
        firstName='Admin',
        lastName='Admin',
        admin=True
    )

createUser()