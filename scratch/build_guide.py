from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, HRFlowable, ListFlowable, ListItem
)
from reportlab.platypus.flowables import Flowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas as canvas_mod

ANTHRACITE = colors.HexColor('#0E0E0D')
YELLOW = colors.HexColor('#F2C400')
GRAY = colors.HexColor('#6B6B66')
LIGHT_BG = colors.HexColor('#F7F5EF')

OUT = '/Users/antoinesibille/Desktop/coaching-app/scratch/guide-allure-athletes.pdf'

styles = getSampleStyleSheet()

title_style = ParagraphStyle('TitleBig', parent=styles['Title'], fontName='Helvetica-Bold',
                              fontSize=34, leading=38, textColor=ANTHRACITE, alignment=TA_CENTER, spaceAfter=6)
subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontName='Helvetica',
                                 fontSize=13, leading=18, textColor=GRAY, alignment=TA_CENTER, spaceAfter=4)
club_style = ParagraphStyle('Club', parent=styles['Normal'], fontName='Helvetica-Bold',
                             fontSize=15, leading=20, textColor=ANTHRACITE, alignment=TA_CENTER, spaceBefore=40)
coach_style = ParagraphStyle('Coach', parent=styles['Normal'], fontName='Helvetica',
                              fontSize=11, leading=16, textColor=GRAY, alignment=TA_CENTER)

h1_style = ParagraphStyle('H1', parent=styles['Heading1'], fontName='Helvetica-Bold',
                           fontSize=17, leading=21, textColor=ANTHRACITE, spaceBefore=4, spaceAfter=10)
h1_num_style = ParagraphStyle('H1Num', parent=h1_style, textColor=YELLOW)

body_style = ParagraphStyle('Body', parent=styles['Normal'], fontName='Helvetica',
                             fontSize=10.5, leading=15.5, textColor=ANTHRACITE, spaceAfter=6)
bullet_style = ParagraphStyle('Bullet', parent=body_style, leftIndent=0, spaceAfter=4)

footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontName='Helvetica',
                               fontSize=8, textColor=GRAY, alignment=TA_CENTER)

def section_header(number, title):
    """A small yellow pill with the number + a bold title, as a Table for layout control."""
    pill = Table([[Paragraph(str(number), ParagraphStyle('PillNum', fontName='Helvetica-Bold', fontSize=13,
                                                           textColor=ANTHRACITE, alignment=TA_CENTER))]],
                 colWidths=[9 * mm], rowHeights=[9 * mm])
    pill.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), YELLOW),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ROUNDEDCORNERS', [5, 5, 5, 5]),
    ]))
    title_p = Paragraph(title, ParagraphStyle('SecTitle', fontName='Helvetica-Bold', fontSize=15,
                                               textColor=ANTHRACITE, leading=18))
    t = Table([[pill, title_p]], colWidths=[12 * mm, None])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (1, 0), (1, 0), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    return t

def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(it, bullet_style), leftIndent=10, value='•') for it in items],
        bulletType='bullet', leftIndent=12, spaceBefore=2, spaceAfter=8,
    )

class TopBar(Flowable):
    """Thin anthracite bar with 'ALLURE' wordmark, drawn on interior pages."""
    def __init__(self, width, height=14 * mm):
        Flowable.__init__(self)
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        c.setFillColor(ANTHRACITE)
        c.roundRect(0, 0, 9 * mm, 9 * mm, 2 * mm, fill=1, stroke=0)
        c.setFillColor(YELLOW)
        c.circle(4.5 * mm, 5.5 * mm, 1.6 * mm, fill=1, stroke=0)
        c.setFillColor(ANTHRACITE)
        c.setFont('Helvetica-Bold', 13)
        c.drawString(12 * mm, 2.2 * mm, 'ALLURE')
        c.setFillColor(GRAY)
        c.setFont('Helvetica', 8.5)
        c.drawRightString(self.width, 2.5 * mm, "Guide de l'athlète · ACLR La Roche-sur-Yon")

def build():
    doc = SimpleDocTemplate(OUT, pagesize=A4,
                             topMargin=18 * mm, bottomMargin=18 * mm, leftMargin=20 * mm, rightMargin=20 * mm)
    usable_width = A4[0] - 40 * mm
    story = []

    # ---- Title page ----
    story.append(Spacer(1, 55 * mm))
    logo_table = Table([['']], colWidths=[22 * mm], rowHeights=[22 * mm])
    logo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), YELLOW),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    story.append(Table([[logo_table]], colWidths=[usable_width], style=TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER')])))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph('ALLURE', title_style))
    story.append(Paragraph("Guide de l'athlète", subtitle_style))
    story.append(Paragraph('ACLR — La Roche-sur-Yon', club_style))
    story.append(Paragraph('Coach : Dominique Guillet', coach_style))
    story.append(Spacer(1, 60 * mm))
    story.append(HRFlowable(width=usable_width, thickness=0.6, color=colors.HexColor('#D8D5C8')))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph('https://coaching-app-livid.vercel.app', ParagraphStyle(
        'url', parent=body_style, alignment=TA_CENTER, textColor=GRAY, fontSize=10)))
    story.append(PageBreak())

    def add_section(n, title, paragraphs=None, items=None, note=None):
        story.append(TopBar(usable_width))
        story.append(Spacer(1, 8 * mm))
        story.append(section_header(n, title))
        story.append(Spacer(1, 4 * mm))
        if paragraphs:
            for p in paragraphs:
                story.append(Paragraph(p, body_style))
        if items:
            story.append(bullets(items))
        if note:
            note_table = Table([[Paragraph(note, ParagraphStyle('Note', parent=body_style, textColor=ANTHRACITE, fontSize=9.5))]],
                                colWidths=[usable_width])
            note_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 7),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                ('LINEBEFORE', (0, 0), (0, -1), 2.5, YELLOW),
            ]))
            story.append(Spacer(1, 3 * mm))
            story.append(note_table)
        story.append(PageBreak())

    add_section(
        1, 'Se connecter',
        paragraphs=[
            "Rends-toi sur <b>https://coaching-app-livid.vercel.app</b> depuis ton téléphone ou ton ordinateur, "
            "puis connecte-toi avec l'email et le mot de passe fournis par ton coach.",
            "Si tu as oublié ton mot de passe, clique sur <b>« Mot de passe oublié ? »</b> sur l'écran de connexion : "
            "un email te permettra d'en choisir un nouveau.",
        ],
        note="Pense à changer ton mot de passe par défaut dès ta première connexion : "
             "<b>Profil → Compte → Changer le mot de passe</b>.",
    )

    add_section(
        2, 'Tableau de bord',
        paragraphs=["C'est l'écran d'accueil. Tu y retrouves chaque jour :"],
        items=[
            "La <b>séance du jour</b> prévue par ton coach, avec son contenu détaillé.",
            "Le <b>bilan de forme quotidien</b> à remplir : sommeil, fatigue, stress, courbatures, motivation.",
            "Un aperçu de tes <b>statistiques de la semaine</b> (séances faites, kilomètres parcourus).",
        ],
    )

    add_section(
        3, 'Entraînements',
        paragraphs=[
            "Le calendrier affiche toutes les séances prévues par ton coach. Clique sur une séance pour voir le détail : "
            "contenu, allures cibles, et chronos par répétition quand ils sont précisés.",
            "Une fois la séance faite, <b>valide-la</b> en indiquant ton ressenti (RPE), la distance et la durée réelles, "
            "et si besoin le chrono et la récupération de chaque répétition.",
        ],
        note="Tu peux aussi enregistrer une <b>séance libre</b> — course, vélo, natation, musculation ou kiné — "
             "même si elle n'était pas prévue par ton coach.",
    )

    add_section(
        4, 'Disponibilités',
        paragraphs=[
            "Dans ton <b>Profil</b>, indique pour chaque jour de la semaine si tu es disponible le matin et/ou "
            "l'après-midi. Ton coach en tient compte pour organiser les séances de groupe.",
        ],
    )

    add_section(
        5, 'Messagerie',
        paragraphs=[
            "Échange directement avec ton coach, ou reçois les annonces du club depuis l'onglet Messagerie.",
        ],
    )

    add_section(
        6, 'Communauté',
        paragraphs=[
            "Retrouve les <b>défis du club</b> (défi hebdomadaire, kilométrage cumulé de la saison...) et les "
            "<b>classements</b> entre athlètes. Une bonne façon de suivre l'ambiance du groupe et de se motiver "
            "les uns les autres.",
        ],
    )

    add_section(
        7, 'Connecter Strava (optionnel)',
        paragraphs=[
            "Depuis ton <b>Profil</b>, tu peux connecter ton compte Strava. Tes sorties course seront alors "
            "importées automatiquement et rapprochées des séances prévues par ton coach — plus besoin de tout "
            "ressaisir à la main.",
        ],
    )

    add_section(
        8, 'Ton profil',
        paragraphs=["Depuis ton Profil, tu peux aussi :"],
        items=[
            "Consulter et mettre à jour tes <b>records personnels</b>.",
            "Signaler une <b>blessure</b> pour que ton coach en soit informé.",
            "Gérer tes préférences de <b>notifications</b>.",
            "Changer de thème <b>clair / sombre</b>.",
            "Changer ton <b>mot de passe</b> à tout moment.",
        ],
    )

    # Last section: no PageBreak after (or leave the trailing break, harmless)
    story.append(TopBar(usable_width))
    story.append(Spacer(1, 8 * mm))
    story.append(section_header(9, "Besoin d'aide ?"))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        "Pour toute question sur l'application, contacte directement ton coach <b>Dominique Guillet</b> "
        "via la messagerie de l'app. Bonne saison à toutes et à tous !", body_style))

    doc.build(story)

if __name__ == '__main__':
    build()
    print('OK')
