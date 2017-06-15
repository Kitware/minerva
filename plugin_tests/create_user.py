from girder.utility.model_importer import ModelImporter


def createUser():
    ModelImporter().model('user').createUser(
        login='admin',
        password='adminpassword!',
        email='minerva@email.com',
        firstName='Admin',
        lastName='Admin',
        admin=True
    )


createUser()
